using LinfishAppcation.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LinfishAppcation.Controllers;

[ApiController, Route("api/product-images")]
public sealed class ProductImagesController(AppDbContext db) : ControllerBase
{
    [HttpGet("{name}")]
    public async Task<IActionResult> Get(string name, CancellationToken ct)
    {
        if (!name.EndsWith(".webp", StringComparison.Ordinal) || !Guid.TryParseExact(name[..^5], "N", out _)) return NotFound();
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await connection.OpenAsync(ct);
        await using var command = new NpgsqlCommand("select image_data, content_type from cmepms.product_image_data where object_key=@key", connection);
        command.Parameters.AddWithValue("key", "db-images/" + name);
        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return NotFound();
        Response.Headers.CacheControl = "public, max-age=86400, immutable";
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(reader.GetFieldValue<byte[]>(0), reader.GetString(1));
    }
}
