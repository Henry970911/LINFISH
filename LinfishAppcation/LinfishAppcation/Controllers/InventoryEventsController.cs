using LinfishAppcation.Services;
using Microsoft.AspNetCore.Mvc;

namespace LinfishAppcation.Controllers;

// 2026-11-27：僅推送庫存變更訊號，不包含訂單或會員資料。
[ApiController, Route("api/inventory-events")]
public sealed class InventoryEventsController(InventoryNotifications notifications) : ControllerBase
{
    [HttpGet]
    public async Task Events(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-cache, no-transform";
        Response.Headers.Append("X-Accel-Buffering", "no");
        Response.ContentType = "text/event-stream";
        var (id, reader) = notifications.Subscribe();
        try {
            await Response.WriteAsync(": connected\n\n", ct); await Response.Body.FlushAsync(ct);
            await foreach (var item in reader.ReadAllAsync(ct)) {
                await Response.WriteAsync("data: changed\n\n", ct); await Response.Body.FlushAsync(ct);
            }
        } catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        finally { notifications.Unsubscribe(id); }
    }
}
