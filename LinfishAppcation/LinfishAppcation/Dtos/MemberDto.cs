using Microsoft.AspNetCore.Mvc;

namespace LinfishAppcation.Dtos;

public sealed record MemberDto(
    string UserNo,
    string UserName,
    string? UserPhone,
    string Email,
    string MemberTier,
    short Status,
    DateTime CreatedAt);
