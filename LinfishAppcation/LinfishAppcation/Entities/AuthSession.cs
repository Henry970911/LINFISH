namespace LinfishAppcation.Entities;

/// <summary>
/// 後端登入工作階段。會員主資料仍由 cmbase.ogcusr 管理，
/// 此實體只保存登入期限與 Refresh Token 雜湊，絕不保存明碼 Token。
/// </summary>
public sealed class AuthSession
{
    public Guid Id { get; set; }

    public Guid MemberId { get; set; }

    public string RefreshTokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime LastSeenAt { get; set; }

    public DateTime AbsoluteExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public Member Member { get; set; } = null!;
}
