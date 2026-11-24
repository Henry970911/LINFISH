using LinfishAppcation.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LinfishAppcation.Services;

/// <summary>
/// 建立短效 Access Token。Token 只用來呼叫 API，真正可續登入的狀態
/// 由 cmbase.ogcsession 與 HttpOnly Refresh Cookie 管理。
/// </summary>
public sealed class JwtTokenService(IOptions<AuthOptions> options)
{
    private readonly AuthOptions auth = options.Value;

    /// <summary>
    /// 
    /// </summary>
    /// <param name="member"></param>
    /// <param name="sessionId"></param>
    /// <returns></returns>
    /// <exception cref="InvalidOperationException"></exception>
    public AuthToken Create(Member member, Guid sessionId)
    {
        if (auth.JwtKey.Length < 32)
        {
            throw new InvalidOperationException("Auth:JwtKey 長度至少需要 32 個字元。");
        }

        var expiresAt = DateTime.UtcNow.AddMinutes(auth.AccessTokenMinutes);

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(auth.JwtKey));

        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        /// mem_tier 是後端角色的唯一資料來源；前端傳入的角色一律不採信。
        var role = string.Equals(
            member.MemberTier,
            "Admin",
            StringComparison.OrdinalIgnoreCase)
                ? "admin"
                : "member";

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, member.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, member.UserEmail ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Name, member.UserName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("sid", sessionId.ToString()),
            new Claim("member_no", member.UserNo),
            new Claim("role", role)
        };

        var token = new JwtSecurityToken(auth.Issuer, auth.Audience, claims, expires: expiresAt, signingCredentials: credentials);

        return new AuthToken(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}

public sealed record AuthToken(string AccessToken, DateTime ExpiresAt);
