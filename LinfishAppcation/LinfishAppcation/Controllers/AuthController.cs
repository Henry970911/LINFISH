using LinfishAppcation.Data;
using LinfishAppcation.Dtos;
using LinfishAppcation.Entities;
using LinfishAppcation.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Net.Mail;

namespace LinfishAppcation.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public sealed class AuthController(
    AppDbContext dbContext,
    IPasswordHasher<Member> passwordHasher,
    JwtTokenService tokenService,
    RefreshTokenService refreshTokenService,
    IOptions<AuthOptions> authOptions,
    IWebHostEnvironment environment) : ControllerBase
{
    private readonly AuthOptions auth = authOptions.Value;

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        var email = NormalizeEmail(request.Email);

        if (name.Length is < 1 or > 100)
        {
            return BadRequest(new
            {
                code = "invalid_name",
                message = "姓名必須介於 1 到 100 個字元。"
            });
        }

        if (!MailAddress.TryCreate(email, out _))
        {
            return BadRequest(new
            {
                code = "invalid_email",
                message = "Email 格式不正確。"
            });
        }

        if (request.Password is null
            || request.Password.Length is < 8 or > 128)
        {
            return BadRequest(new
            {
                code = "invalid_password",
                message = "密碼必須介於 8 到 128 個字元。"
            });
        }

        var emailExists = await dbContext.Members
            .AsNoTracking()
            .AnyAsync(
                member => member.UserEmail != null
                    && member.UserEmail.ToLower() == email,
                cancellationToken);

        if (emailExists)
        {
            return Conflict(new
            {
                code = "email_exists",
                message = "這個 Email 已經申請過會員，請直接登入。"
            });
        }

        var member = new Member
        {
            Id = Guid.NewGuid(),
            UserNo = await NextMemberNumber(cancellationToken),
            UserName = name,
            UserEmail = email,
            MemberTier = "Regular",
            Status = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // PasswordHasher 使用 PBKDF2、隨機 Salt 與版本化格式。
        // ogcusr.usr_pass 永遠只保存不可逆雜湊，不保存或記錄明碼密碼。
        member.PasswordHash = passwordHasher.HashPassword(
            member,
            request.Password);

        dbContext.Members.Add(member);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            return Conflict(new
            {
                code = "email_exists",
                message = "這個 Email 已經申請過會員，請直接登入。"
            });
        }

        // 註冊只建立會員，不核發 JWT 或 Refresh Token。
        // 使用者必須回到登入頁再次輸入帳密，成功後才建立 Session。
        return Ok(new RegisterResponse(
            "會員註冊成功，請使用剛才設定的帳號密碼登入。",
            ToDto(member)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);

        if (string.IsNullOrWhiteSpace(email)
            || string.IsNullOrEmpty(request.Password))
        {
            return Unauthorized(InvalidCredentials());
        }

        var member = await dbContext.Members
            .SingleOrDefaultAsync(
                item => item.UserEmail != null
                    && item.UserEmail.ToLower() == email,
                cancellationToken);

        if (!CanLogin(member))
        {
            return Unauthorized(InvalidCredentials());
        }

        var verification = passwordHasher.VerifyHashedPassword(
            member!,
            member!.PasswordHash!,
            request.Password);

        if (verification == PasswordVerificationResult.Failed)
        {
            return Unauthorized(InvalidCredentials());
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            member.PasswordHash = passwordHasher.HashPassword(
                member,
                request.Password);
            member.UpdatedAt = DateTime.UtcNow;
        }

        var now = DateTime.UtcNow;
        var session = new AuthSession
        {
            Id = Guid.NewGuid(),
            MemberId = member.Id,
            CreatedAt = now,
            LastSeenAt = now,
            AbsoluteExpiresAt = now.AddHours(auth.AbsoluteTimeoutHours),
            IpAddress = Limit(Request.HttpContext.Connection.RemoteIpAddress?.ToString(), 45),
            UserAgent = Limit(Request.Headers.UserAgent.ToString(), 500)
        };

        // 明碼 Refresh Token 只寫入 HttpOnly Cookie；資料庫只保存雜湊。
        var refreshToken = refreshTokenService.Create(session.Id);
        session.RefreshTokenHash = refreshToken.Hash;

        dbContext.AuthSessions.Add(session);
        await dbContext.SaveChangesAsync(cancellationToken);

        WriteRefreshCookie(refreshToken.CookieValue, session.AbsoluteExpiresAt);
        return Ok(CreateAuthResponse(member, session));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(
        CancellationToken cancellationToken)
    {
        var cookieValue = Request.Cookies[auth.RefreshCookieName];

        if (!refreshTokenService.TryGetSessionId(cookieValue, out var sessionId))
        {
            ClearRefreshCookie();
            return Unauthorized(SessionExpired());
        }

        var session = await dbContext.AuthSessions
            .Include(item => item.Member)
            .SingleOrDefaultAsync(item => item.Id == sessionId, cancellationToken);

        var now = DateTime.UtcNow;
        var idleExpired = session is not null
            && session.LastSeenAt.AddMinutes(auth.IdleTimeoutMinutes) <= now;
        var absoluteExpired = session is not null
            && session.AbsoluteExpiresAt <= now;

        if (session is null
            || session.RevokedAt is not null
            || idleExpired
            || absoluteExpired
            || !CanLogin(session.Member))
        {
            await RevokeIfActive(session, now, cancellationToken);
            ClearRefreshCookie();
            return Unauthorized(SessionExpired());
        }

        // 雜湊不相符代表舊 Token 被重複使用或 Cookie 遭竄改。
        // 為避免遭竊 Token 持續刷新，立即撤銷整個 Session。
        if (cookieValue is null
            || !refreshTokenService.Verify(
                cookieValue,
                session.RefreshTokenHash))
        {
            session.RevokedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            ClearRefreshCookie();
            return Unauthorized(SessionExpired());
        }

        // Refresh Token Rotation：每次刷新都換發新 Token，舊 Token 立即失效。
        var rotatedToken = refreshTokenService.Create(session.Id);
        session.RefreshTokenHash = rotatedToken.Hash;
        session.LastSeenAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        WriteRefreshCookie(rotatedToken.CookieValue, session.AbsoluteExpiresAt);
        return Ok(CreateAuthResponse(session.Member, session));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var cookieValue = Request.Cookies[auth.RefreshCookieName];

        if (refreshTokenService.TryGetSessionId(cookieValue, out var sessionId))
        {
            var session = await dbContext.AuthSessions
                .SingleOrDefaultAsync(item => item.Id == sessionId, cancellationToken);

            if (session is not null && session.RevokedAt is null)
            {
                // 後端撤銷是正式登出的關鍵，不能只刪除前端資料。
                session.RevokedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        ClearRefreshCookie();
        return NoContent();
    }

    private AuthResponse CreateAuthResponse(
        Member member,
        AuthSession session)
    {
        var token = tokenService.Create(member, session.Id);

        return new AuthResponse(
            token.AccessToken,
            token.ExpiresAt,
            session.AbsoluteExpiresAt,
            ToDto(member));
    }

    private void WriteRefreshCookie(
        string cookieValue,
        DateTime absoluteExpiresAt)
    {
        Response.Cookies.Append(
            auth.RefreshCookieName,
            cookieValue,
            CreateCookieOptions(absoluteExpiresAt));
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(
            auth.RefreshCookieName,
            CreateCookieOptions(DateTime.UtcNow.AddDays(-1)));
    }

    private CookieOptions CreateCookieOptions(DateTime expiresAt) => new()
    {
        HttpOnly = true,
        // localhost 開發使用 HTTP；正式環境強制 Secure，只能經由 HTTPS 傳送。
        Secure = !environment.IsDevelopment(),
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = new DateTimeOffset(expiresAt),
        IsEssential = true
    };

    private async Task RevokeIfActive(
        AuthSession? session,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (session is null || session.RevokedAt is not null)
        {
            return;
        }

        session.RevokedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> NextMemberNumber(
        CancellationToken cancellationToken)
    {
        var nextValue = await dbContext.Database
            .SqlQueryRaw<long>(
                "select nextval('cmbase.ogcusr_usr_no_seq') as \"Value\"")
            .SingleAsync(cancellationToken);

        return $"LF{nextValue:000000}";
    }

    private static bool CanLogin(Member? member) =>
        member is not null
        && !string.IsNullOrWhiteSpace(member.PasswordHash)
        && member.Status == 1
        && member.DeleteRequestedAt is null;

    private static string NormalizeEmail(string? email) =>
        email?.Trim().ToLowerInvariant() ?? string.Empty;

    private static string? Limit(string? value, int maximumLength) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : value.Length <= maximumLength
                ? value
                : value[..maximumLength];

    private static object InvalidCredentials() => new
    {
        code = "invalid_credentials",
        message = "Email 或密碼不正確。"
    };

    private static object SessionExpired() => new
    {
        code = "session_expired",
        message = "登入時間已逾時，請重新登入。"
    };

    private static MemberDto ToDto(Member member) =>
        new(
            member.UserNo,
            member.UserName,
            member.UserPhone,
            member.UserEmail ?? string.Empty,
            member.MemberTier,
            member.Status,
            member.CreatedAt);
}
