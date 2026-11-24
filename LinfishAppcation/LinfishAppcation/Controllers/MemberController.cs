using LinfishAppcation.Data;
using LinfishAppcation.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LinfishAppcation.Controllers;

[ApiController]
[Route("api/members")]
[Authorize]
public sealed class MembersController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<MemberDto>> GetMe(
        CancellationToken cancellationToken)
    {
        var subject =
            User.FindFirstValue("sub")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(subject, out var userId))
        {
            return Unauthorized();
        }

        var member = await dbContext.Members
            .AsNoTracking()
            .Where(item => item.Id == userId)
            .Select(item => new MemberDto(
                item.UserNo,
                item.UserName,
                item.UserPhone,
                item.UserEmail ?? string.Empty,
                item.MemberTier,
                item.Status,
                item.CreatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        if (member is null)
        {
            return NotFound(new
            {
                message = "找不到會員資料"
            });
        }

        return Ok(member);
    }
}
