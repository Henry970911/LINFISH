using LinfishAppcation.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using LinfishAppcation.Services;
using System.Text.Json;

namespace LinfishAppcation.Controllers;

[ApiController, Route("api/catalog")]
public sealed class CatalogController(AppDbContext db, ProductImageService images) : ControllerBase
{
    [HttpGet("products")]
    public async Task<IActionResult> Products(CancellationToken ct)
    {
        Response.Headers.CacheControl = "private, no-store";

        var connection = (NpgsqlConnection)db.Database.GetDbConnection();

        await connection.OpenAsync(ct);

        // 2026-11-27：商品總數及規格可售組數直接依共用庫存計算。
        const string sql = """
            select p.id,p.product_no,p.product_name,p.description,c.pro_no,c.category_no,c.category_name,
                   s.id,s.sku_no,s.sku_name,case when @member then s.price else null end,coalesce(inv.stock_qty / nullif(s.units_per_sale,0),0)::integer,
                   (select object_key from cmepms.product_image i where i.product_id=p.id order by i.is_main desc,i.sort_order,i.id limit 1),
                   p.video_url,p.variation_name,case when @member then s.original_price else null end,s.image_key,
                   array(select i.object_key from cmepms.product_image i where i.product_id=p.id order by i.is_main desc,i.sort_order,i.id),
                   (select coalesce(sum(pi.stock_qty),0) from cmepms.product_inventory pi where pi.product_id=p.id),s.inventory_id,s.units_per_sale,inv.attributes::text,p.inventory_unit
              from cmepms.product p join cmepms.product_category c on c.id=p.category_id              left join cmepms.product_sku s on s.product_id=p.id and s.is_active and not s.is_deleted
              left join cmepms.product_inventory inv on inv.id=s.inventory_id
             where p.status='ACTIVE' and not p.is_deleted and c.is_active order by p.id,s.id
            """;

        await using var cmd = new NpgsqlCommand(sql, connection); cmd.Parameters.AddWithValue("member", User.Identity?.IsAuthenticated == true);

        await using var r = await cmd.ExecuteReaderAsync(ct);

        var products = new Dictionary<long, CatalogProduct>();

        while (await r.ReadAsync(ct))
        {
            var id = r.GetInt64(0);

            if (!products.TryGetValue(id, out var product))
            {

                product = new CatalogProduct(id, r.GetString(1), r.GetString(2), r.IsDBNull(3) ? "" : r.GetString(3), r.GetString(4), r.GetString(5), r.GetString(6), r.IsDBNull(12) ? null : images.ResolveUrl(r.GetString(12)), r.IsDBNull(13) ? null : r.GetString(13), r.IsDBNull(14) ? null : r.GetString(14), r.GetFieldValue<string[]>(17).Select(images.ResolveUrl).Where(x => x is not null).Select(x => x!).ToList(), r.GetInt64(18), r.GetString(22), []);

                products.Add(id, product);
            }

            if (!r.IsDBNull(7)) product.Skus.Add(new CatalogSku(r.GetInt64(7), r.GetString(8), r.GetString(9), r.IsDBNull(10) ? null : r.GetDecimal(10), r.GetInt32(11), r.IsDBNull(15) ? null : r.GetDecimal(15), r.IsDBNull(16) ? null : images.ResolveUrl(r.GetString(16)), r.GetInt64(19), r.GetInt32(20), JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r.GetString(21)) ?? []));
        }

        return Ok(products.Values);
    }
    public sealed record CatalogProduct(long Id, string ProductNo, string ProductName, string Description, string ProNo, string CategoryNo, string CategoryName, string? Image, string? VideoUrl, string? VariationName, List<string> Images, long TotalStock, string InventoryUnit, List<CatalogSku> Skus);
    public sealed record CatalogSku(long Id, string SkuNo, string SkuName, decimal? Price, int StockQty, decimal? OriginalPrice, string? ImageKey, long InventoryId, int UnitsPerSale, Dictionary<string, JsonElement> Attributes);
}
