namespace LinfishAppcation.Services;

/// <summary>
/// 正式環境登入期限設定。可由 appsettings、環境變數或 user-secrets 覆寫。
/// </summary>
public sealed class AuthOptions
{
    public string Issuer { get; set; } = "LINFISH";

    public string Audience { get; set; } = "LINFISH.Web";

    public string JwtKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;

    public int IdleTimeoutMinutes { get; set; } = 30;

    public int AbsoluteTimeoutHours { get; set; } = 8;

    public string RefreshCookieName { get; set; } = "linfish.refresh";
}
