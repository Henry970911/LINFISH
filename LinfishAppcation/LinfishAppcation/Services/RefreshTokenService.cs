using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;
using System.Text;

namespace LinfishAppcation.Services;

/// <summary>
/// 建立及驗證 Refresh Token。瀏覽器只取得隨機明碼，資料庫只保存 SHA-256 雜湊。
/// Token 每次刷新都會輪替，舊 Token 無法再次使用。
/// </summary>
public sealed class RefreshTokenService
{
    public RefreshToken Create(Guid sessionId)
    {
        var secretBytes = RandomNumberGenerator.GetBytes(64);

        var secret = WebEncoders.Base64UrlEncode(secretBytes);

        var cookieValue = $"{sessionId:N}.{secret}";

        return new RefreshToken(cookieValue, Hash(cookieValue));
    }

    public bool TryGetSessionId(string? cookieValue, out Guid sessionId)
    {
        sessionId = Guid.Empty;

        if (string.IsNullOrWhiteSpace(cookieValue))
        {
            return false;
        }

        var separator = cookieValue.IndexOf('.');

        return separator > 0 && Guid.TryParseExact(cookieValue[..separator], "N", out sessionId);
    }

    public bool Verify(string cookieValue, string expectedHash)
    {
        var actualBytes = Encoding.UTF8.GetBytes(Hash(cookieValue));

        var expectedBytes = Encoding.UTF8.GetBytes(expectedHash);

        return actualBytes.Length == expectedBytes.Length && CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }

    public string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

public sealed record RefreshToken(string CookieValue, string Hash);
