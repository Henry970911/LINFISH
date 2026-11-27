using LinfishAppcation.Data;
using LinfishAppcation.Entities;
using LinfishAppcation.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Render terminates TLS at its edge and forwards requests to this HTTP port.
// Do not trust arbitrary forwarded headers; image URLs are made relative instead.
var isRender = string.Equals(builder.Configuration["RENDER"], "true", StringComparison.OrdinalIgnoreCase);
if (isRender)
{
    var portValue = builder.Configuration["PORT"] ?? "10000";
    if (!int.TryParse(portValue, out var port) || port is < 1 or > 65535)
        throw new InvalidOperationException("Render PORT 無效。");
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddControllers();
builder.Services.AddOpenApi();

const string frontendCorsPolicy = "Frontend";

builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            // Refresh Token 存在 HttpOnly Cookie，跨開發連接埠時必須允許 Cookie。
            .AllowCredentials();
    });
});

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "找不到 ConnectionStrings:DefaultConnection");

var authSection = builder.Configuration.GetSection("Auth");
var authSettings = authSection.Get<AuthOptions>() ?? new AuthOptions();
var jwtKey = authSettings.JwtKey;

if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "Auth:JwtKey 長度至少需要 32 個字元。");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.Configure<AuthOptions>(authSection);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = authSettings.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = "email",
            RoleClaimType = "role",
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var sessionClaim = context.Principal?.FindFirstValue("sid");
                var memberClaim = context.Principal?.FindFirstValue("sub");
                var roleClaim = context.Principal?.FindFirstValue("role");

                if (!Guid.TryParse(sessionClaim, out var sessionId)
                    || !Guid.TryParse(memberClaim, out var memberId))
                {
                    context.Fail("Token 缺少有效的 Session 資訊。");
                    return;
                }

                var dbContext = context.HttpContext.RequestServices
                    .GetRequiredService<AppDbContext>();
                var session = await dbContext.AuthSessions
                    .Include(item => item.Member)
                    .SingleOrDefaultAsync(
                        item => item.Id == sessionId,
                        context.HttpContext.RequestAborted);

                var now = DateTime.UtcNow;
                var expectedRole = string.Equals(
                    session?.Member.MemberTier,
                    "Admin",
                    StringComparison.OrdinalIgnoreCase)
                        ? "admin"
                        : "member";
                var isInvalid = session is null
                    || session.MemberId != memberId
                    || session.RevokedAt is not null
                    || session.AbsoluteExpiresAt <= now
                    || session.LastSeenAt
                        .AddMinutes(authSettings.IdleTimeoutMinutes) <= now
                    || session.Member.Status != 1
                    || session.Member.DeleteRequestedAt is not null
                    // 會員等級變更後，舊角色 Token 立即失效並由 Refresh 換發。
                    || !string.Equals(
                        roleClaim,
                        expectedRole,
                        StringComparison.Ordinal);

                if (isInvalid)
                {
                    context.Fail("登入工作階段已失效。");
                    return;
                }

                // 以五分鐘為單位更新活動時間，避免每個 API 請求都寫入資料庫。
                // 後端活動時間才是閒置逾時的最終判斷依據。
                if (session!.LastSeenAt.AddMinutes(5) <= now)
                {
                    session.LastSeenAt = now;
                    await dbContext.SaveChangesAsync(
                        context.HttpContext.RequestAborted);
                }
            }
        };
    });

builder.Services.AddScoped<IPasswordHasher<Member>, PasswordHasher<Member>>();
builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();
// 2026-11-27：通知前後台付款後庫存變更。
builder.Services.AddSingleton<InventoryNotifications>();
builder.Services.AddScoped<ProductImageService>();
builder.Services.AddScoped<StorageCleanupService>();
builder.Services.AddHostedService<StorageCleanupWorker>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<RefreshTokenService>();
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
});

// 會員註冊與登入完全由本站 API + cmbase.ogcusr 處理。
// 此流程不呼叫 Supabase Auth、不寄驗證信，也不需要 Email callback。

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Render's public edge enforces HTTPS before forwarding HTTP to the container.
if (!app.Environment.IsDevelopment() && !isRender)
{
    app.UseHttpsRedirection();
}

app.UseCors(frontendCorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Process health only; this endpoint does not query the database.
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapControllers();

// Production databases are migrated deliberately; startup should not change their schema.
if (builder.Configuration.GetValue<bool?>("Database:RunInitializer") ?? app.Environment.IsDevelopment())
    await DatabaseInitializer.InitializeAsync(app.Services);

app.Run();
