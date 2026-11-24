using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LinfishAppcation.Controllers;

/// <summary>
/// 管理者 API 的共同入口。所有後續商品、會員、財務、倉儲 API
/// 都必須使用相同的 Admin Role 授權，不能只依靠前端路由保護。
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public sealed class AdminController : ControllerBase
{
    [HttpGet("access")]
    public IActionResult VerifyAccess()
    {
        return Ok(new
        {
            authorized = true,
            memberId = User.FindFirstValue("sub"),
            memberNo = User.FindFirstValue("member_no"),
            modules = new[]
            {
                "products",
                "members",
                "finance",
                "warehouse"
            }
        });
    }
}
