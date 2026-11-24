namespace LinfishAppcation.Dtos;

public sealed record RegisterRequest(
    string? Name,
    string? Email,
    string? Password);

public sealed record LoginRequest(
    string? Email,
    string? Password);

public sealed record RegisterResponse(
    string Message,
    MemberDto Member);

public sealed record AuthResponse(
    string AccessToken,
    DateTime ExpiresAt,
    DateTime SessionExpiresAt,
    MemberDto Member);
