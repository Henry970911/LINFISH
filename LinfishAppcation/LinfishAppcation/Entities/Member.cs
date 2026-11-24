using Microsoft.AspNetCore.Mvc;

namespace LinfishAppcation.Entities;

public sealed class Member
{
    public Guid Id { get; set; }

    public string UserNo { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string? UserPhone { get; set; }

    public string? UserEmail { get; set; }

    public string? PasswordHash { get; set; }

    public string MemberTier { get; set; } = "Regular";

    public short Status { get; set; } = 1;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? EndDate { get; set; }

    public DateTime? DeleteRequestedAt { get; set; }
}
