using LinfishAppcation.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using LinfishAppcation.Services;
using System.Security.Cryptography;

namespace LinfishAppcation.Controllers;

[ApiController]
[Route("api/admin/commerce")]
[Authorize(Roles = "admin")]
public sealed class AdminCommerceController(AppDbContext db, ProductImageService imageService) : ControllerBase
{
    private NpgsqlConnection Connection => (NpgsqlConnection)db.Database.GetDbConnection();
    private static string NewProductNo() => $"{TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTimeOffset.UtcNow, "Asia/Taipei").Year}{RandomNumberGenerator.GetInt32(100_000_000):D8}";
    public sealed record ProductInput(string? ProductNo, long CategoryId, string? ProductName, string? Description, string? Status, string? VideoUrl, string? VariationName, string? VariationMode);
    public sealed record SkuInput(string? SkuNo, string? SkuName, decimal Price, int StockQty, bool IsActive, int? ExpectedStockQty, decimal? OriginalPrice, string? Barcode, string? ImageKey, long? TaxTypeId, string? TemperatureZone, long[]? ShippingMethodIds);
    public sealed record ImageInput(string? ObjectKey, string? AltText, int SortOrder, bool IsMain);
    public sealed record ProductStatusInput(string? Status);
    public sealed record BatchSkuInput(List<SkuInput>? Items);
    public sealed record CreateProductInput(ProductInput? Product, List<SkuInput>? Skus);
    public sealed record UpdateSingleInput(ProductInput? Product, long SkuId, SkuInput? Sku);
    public sealed record ImageOrderInput(long[]? ImageIds);
    public sealed record SkuPriceUpdate(long Id, decimal Price, decimal? OriginalPrice, int StockQty, int ExpectedStockQty, bool IsActive);
    public sealed record SkuPriceBatch(List<SkuPriceUpdate>? Items);

    [HttpGet("main-categories")]
    public async Task<IActionResult> MainCategories(CancellationToken ct)
    {
        await Connection.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("select pro_no,pro_name from cmepms.protyp order by id", Connection);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var items = new List<object>();
        while (await reader.ReadAsync(ct)) items.Add(new { proNo = reader.GetString(0), name = reader.GetString(1) });
        return Ok(items);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories(CancellationToken ct)
    {
        await Connection.OpenAsync(ct);

        await using var cmd = new NpgsqlCommand("select id,pro_no,category_no,category_name from cmepms.product_category where is_active order by sort_order,id", Connection);

        await using var reader = await cmd.ExecuteReaderAsync(ct);

        var items = new List<object>();

        while (await reader.ReadAsync(ct)) items.Add(new { id = reader.GetInt64(0), proNo = reader.GetString(1), categoryNo = reader.GetString(2), categoryName = reader.GetString(3) });

        return Ok(items);
    }

    [HttpGet("products")]
    public async Task<IActionResult> Products(CancellationToken ct)
    {
        await Connection.OpenAsync(ct);

        await using var cmd = new NpgsqlCommand("""
            select p.id,p.product_no,p.category_id,p.product_name,p.description,p.status,c.category_name,c.pro_no,
                   (select i.object_key from cmepms.product_image i where i.product_id=p.id order by i.is_main desc,i.sort_order,i.id limit 1),
                   s.minimum_price,s.maximum_price,coalesce(t.stock_qty,0),p.video_url,p.variation_name,p.variation_mode,p.uses_shared_inventory
            from cmepms.product p join cmepms.product_category c on c.id=p.category_id
            left join cmepms.product_inventory_total t on t.product_id=p.id
            left join lateral (select min(price) minimum_price,max(price) maximum_price from cmepms.product_sku where product_id=p.id and is_active) s on true
            where not p.is_deleted order by p.id desc
            """, Connection);

        await using var reader = await cmd.ExecuteReaderAsync(ct);

        var items = new List<object>();

        while (await reader.ReadAsync(ct)) items.Add(new { id = reader.GetInt64(0), productNo = reader.GetString(1), categoryId = reader.GetInt64(2), productName = reader.GetString(3), description = reader.IsDBNull(4) ? null : reader.GetString(4), status = reader.GetString(5), categoryName = reader.GetString(6), proNo = reader.GetString(7), image = reader.IsDBNull(8) ? null : imageService.ResolveUrl(reader.GetString(8)), minimumPrice = reader.IsDBNull(9) ? (decimal?)null : reader.GetDecimal(9), maximumPrice = reader.IsDBNull(10) ? (decimal?)null : reader.GetDecimal(10), stock = reader.GetInt64(11), videoUrl = reader.IsDBNull(12) ? null : reader.GetString(12), variationName = reader.IsDBNull(13) ? null : reader.GetString(13), variationMode = reader.GetString(14), usesSharedInventory = reader.GetBoolean(15) });

        return Ok(items);
    }

    [HttpPost("products")]
    [HttpPut("products/{id:long}")]
    public async Task<IActionResult> SaveProduct(ProductInput input, long? id, CancellationToken ct)
    {
        var no = id is null ? NewProductNo() : input.ProductNo?.Trim(); var name = input.ProductName?.Trim();

        var video = input.VideoUrl?.Trim(); var mode = input.VariationMode ?? "SINGLE";

        if (string.IsNullOrWhiteSpace(no) || no.Length > 30 || string.IsNullOrWhiteSpace(name) || name.Length > 150 || input.CategoryId <= 0 || input.Status is not ("DRAFT" or "ACTIVE" or "INACTIVE") || mode is not ("SINGLE" or "MULTI") || (mode == "MULTI" && string.IsNullOrWhiteSpace(input.VariationName)) || input.Description?.Length > 10000 || (input.VariationName?.Length ?? 0) > 100 || (!string.IsNullOrEmpty(video) && (video.Length > 2048 || !Uri.TryCreate(video, UriKind.Absolute, out var videoUri) || videoUri.Scheme != Uri.UriSchemeHttps)))
            return BadRequest(new { message = "請檢查商品編號、名稱、分類與狀態。" });

        await Connection.OpenAsync(ct);

        await using var tx = await Connection.BeginTransactionAsync(ct);

        if (id.HasValue)
        {
            await using var shared = new NpgsqlCommand("select uses_shared_inventory from cmepms.product where id=@id", Connection, tx);

            shared.Parameters.AddWithValue("id", id.Value);

            if ((await shared.ExecuteScalarAsync(ct)) is true) return Conflict(new { message = "請透過商品規格介面編輯此商品。" });
        }

        if (id.HasValue)
        {
            await using (var product = new NpgsqlCommand("select category_id from cmepms.product where id=@id for update", Connection, tx))
            {
                product.Parameters.AddWithValue("id", id.Value); var existingCategory = await product.ExecuteScalarAsync(ct);

                if (existingCategory is null) return NotFound();

                if ((long)existingCategory != input.CategoryId) return Conflict(new { message = "商品建立後不可變更主分類或次分類，請重新建立商品。" });
            }
            if (mode == "SINGLE") { await using var count = new NpgsqlCommand("select count(*) from cmepms.product_sku where product_id=@id and is_active", Connection, tx); count.Parameters.AddWithValue("id", id.Value); if ((long)(await count.ExecuteScalarAsync(ct))! > 1) return Conflict(new { message = "此商品已有多個啟用規格，請先停用其他規格。" }); }
        }
        if (input.Status == "ACTIVE" && (!id.HasValue || !await CanPublish(id.Value, tx, ct))) return Conflict(new { message = "請先設定至少一個啟用規格，並為每個啟用規格選擇有效稅別及可用物流，才能上架。" });

        var sql = id is null
            ? "insert into cmepms.product(product_no,category_id,product_name,description,status,video_url,variation_name,variation_mode) select @no,c.id,@name,@description,@status,@video,@variation,@mode from cmepms.product_category c where c.id=@category and c.is_active returning id"
            : "update cmepms.product p set category_id=@category,product_name=@name,description=@description,status=@status,video_url=@video,variation_name=@variation,variation_mode=@mode,upd_date=now() where p.id=@id and exists(select 1 from cmepms.product_category c where c.id=@category and c.is_active) returning p.id";

        await using var cmd = new NpgsqlCommand(sql, Connection, tx);

        cmd.Parameters.AddWithValue("no", no);
        cmd.Parameters.AddWithValue("category", input.CategoryId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.Add("description", NpgsqlTypes.NpgsqlDbType.Text).Value = (object?)input.Description?.Trim() ?? DBNull.Value;
        cmd.Parameters.AddWithValue("status", input.Status!);
        cmd.Parameters.Add("video", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrEmpty(video) ? DBNull.Value : video;
        cmd.Parameters.Add("variation", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(input.VariationName) ? DBNull.Value : input.VariationName.Trim();
        cmd.Parameters.AddWithValue("mode", mode);

        if (id.HasValue) cmd.Parameters.AddWithValue("id", id.Value);

        try
        {
            var result = await cmd.ExecuteScalarAsync(ct);

            if (result is null) return BadRequest(new { message = "商品不存在或分類未啟用。" }); await tx.CommitAsync(ct); return Ok(new { id = (long)result });
        }

        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "商品資料發生衝突，請重新載入後再試。" });
        }
    }

    [HttpPost("products/complete")]
    public async Task<IActionResult> CreateProductWithSkus(CreateProductInput input, CancellationToken ct)
    {
        var p = input.Product; var items = input.Skus; var mode = p?.VariationMode; var name = p?.ProductName?.Trim(); var video = p?.VideoUrl?.Trim();
        if (p is null || string.IsNullOrWhiteSpace(name) || name.Length > 150 || p.CategoryId <= 0 || mode is not ("SINGLE" or "MULTI") || (mode == "MULTI" && string.IsNullOrWhiteSpace(p.VariationName)) || (p.VariationName?.Length ?? 0) > 100 || string.IsNullOrWhiteSpace(p.Description) || p.Description.Length > 10000 || (!string.IsNullOrEmpty(video) && (video.Length > 2048 || !Uri.TryCreate(video, UriKind.Absolute, out var videoUri) || videoUri.Scheme != Uri.UriSchemeHttps)) || items is null || items.Count is < 1 or > 100 || (mode == "SINGLE" && items.Count != 1) || items.Any(i => string.IsNullOrWhiteSpace(i.SkuName) || i.SkuName.Trim().Length > 100 || i.Price < 0 || i.Price > 9999999999.99m || decimal.Round(i.Price, 2) != i.Price || i.StockQty < 0 || i.OriginalPrice is < 0 or > 9999999999.99m || (i.OriginalPrice.HasValue && decimal.Round(i.OriginalPrice.Value, 2) != i.OriginalPrice.Value) || (i.Barcode?.Length ?? 0) > 100 || !string.IsNullOrWhiteSpace(i.ImageKey) || i.TemperatureZone is not ("AMBIENT" or "CHILLED" or "FROZEN") || (i.ShippingMethodIds?.Length ?? 0) > 100 || (i.ShippingMethodIds ?? []).Any(x => x <= 0) || (i.ShippingMethodIds ?? []).Distinct().Count() != (i.ShippingMethodIds?.Length ?? 0)) || items.Select(i => i.SkuName!.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != items.Count)
            return BadRequest(new { message = "請檢查商品、分類、說明與規格資料。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        try
        {
            foreach (var item in items)
            {
                if (item.TaxTypeId.HasValue) { await using var tax = new NpgsqlCommand("select exists(select 1 from cmepms.tax_type where id=@id and is_active)", Connection, tx); tax.Parameters.AddWithValue("id", item.TaxTypeId.Value); if (!(bool)(await tax.ExecuteScalarAsync(ct))!) return BadRequest(new { message = "稅別不存在或已停用。" }); }
                var ids = item.ShippingMethodIds ?? []; if (ids.Length > 0) { await using var methods = new NpgsqlCommand("select count(*) from cmepms.shipping_method where id=any(@ids) and temperature_zone=@zone and is_active", Connection, tx); methods.Parameters.AddWithValue("ids", ids); methods.Parameters.AddWithValue("zone", item.TemperatureZone!); if ((long)(await methods.ExecuteScalarAsync(ct))! != ids.Length) return BadRequest(new { message = "物流未啟用或配送溫層不相符。" }); }
            }
            await using var product = new NpgsqlCommand("insert into cmepms.product(product_no,category_id,product_name,description,status,video_url,variation_name,variation_mode) select @no,c.id,@name,@description,'DRAFT',@video,@variation,@mode from cmepms.product_category c where c.id=@category and c.is_active returning id", Connection, tx);
            product.Parameters.AddWithValue("no", NewProductNo()); product.Parameters.AddWithValue("category", p.CategoryId); product.Parameters.AddWithValue("name", name); product.Parameters.AddWithValue("description", p.Description.Trim()); product.Parameters.Add("video", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrEmpty(video) ? DBNull.Value : video; product.Parameters.Add("variation", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(p.VariationName) ? DBNull.Value : p.VariationName.Trim(); product.Parameters.AddWithValue("mode", mode);
            var productValue = await product.ExecuteScalarAsync(ct); if (productValue is null) return BadRequest(new { message = "選擇的商品分類不存在或已停用。" }); var productId = (long)productValue; var skuIds = new List<long>();
            foreach (var item in items) { await using var add = new NpgsqlCommand("insert into cmepms.product_sku(product_id,sku_no,sku_name,price,stock_qty,is_active,original_price,barcode,tax_type_id,temperature_zone) values(@product,@no,@name,@price,@stock,@active,@original,@barcode,@tax,@zone) returning id", Connection, tx); add.Parameters.AddWithValue("product", productId); add.Parameters.AddWithValue("no", "S" + Guid.NewGuid().ToString("N").ToUpperInvariant()); add.Parameters.AddWithValue("name", item.SkuName!.Trim()); add.Parameters.AddWithValue("price", item.Price); add.Parameters.AddWithValue("stock", item.StockQty); add.Parameters.AddWithValue("active", item.IsActive); add.Parameters.Add("original", NpgsqlTypes.NpgsqlDbType.Numeric).Value = (object?)item.OriginalPrice ?? DBNull.Value; add.Parameters.Add("barcode", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(item.Barcode) ? DBNull.Value : item.Barcode.Trim(); add.Parameters.Add("tax", NpgsqlTypes.NpgsqlDbType.Bigint).Value = (object?)item.TaxTypeId ?? DBNull.Value; add.Parameters.AddWithValue("zone", item.TemperatureZone!); var sku = (long)(await add.ExecuteScalarAsync(ct))!; skuIds.Add(sku); foreach (var shippingId in item.ShippingMethodIds ?? []) { await using var link = new NpgsqlCommand("insert into cmepms.sku_shipping_method(sku_id,shipping_method_id) values(@sku,@shipping)", Connection, tx); link.Parameters.AddWithValue("sku", sku); link.Parameters.AddWithValue("shipping", shippingId); await link.ExecuteNonQueryAsync(ct); } }
            await tx.CommitAsync(ct); return Ok(new { id = productId, skuIds });
        }
        catch (PostgresException e) when (e.SqlState is PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.ForeignKeyViolation) { return Conflict(new { message = "商品或規格資料發生衝突，請重新整理後重試。" }); }
    }

    [HttpPut("products/{id:long}/single")]
    public async Task<IActionResult> UpdateSingleProduct(long id, UpdateSingleInput input, CancellationToken ct)
    {
        var p = input.Product; var s = input.Sku; var name = p?.ProductName?.Trim(); var video = p?.VideoUrl?.Trim(); var zone = s?.TemperatureZone ?? "AMBIENT"; var ids = s?.ShippingMethodIds ?? [];
        if (p is null || s is null || input.SkuId <= 0 || string.IsNullOrWhiteSpace(name) || name.Length > 150 || p.CategoryId <= 0 || p.VariationMode != "SINGLE" || p.Status is not ("DRAFT" or "ACTIVE" or "INACTIVE") || string.IsNullOrWhiteSpace(p.Description) || p.Description.Length > 10000 || (p.VariationName?.Length ?? 0) > 100 || (!string.IsNullOrEmpty(video) && (video.Length > 2048 || !Uri.TryCreate(video, UriKind.Absolute, out var videoUri) || videoUri.Scheme != Uri.UriSchemeHttps)) || s.Price < 0 || s.Price > 9999999999.99m || decimal.Round(s.Price, 2) != s.Price || s.StockQty < 0 || !s.ExpectedStockQty.HasValue || s.OriginalPrice is < 0 or > 9999999999.99m || (s.OriginalPrice.HasValue && decimal.Round(s.OriginalPrice.Value, 2) != s.OriginalPrice.Value) || (s.Barcode?.Length ?? 0) > 100 || zone is not ("AMBIENT" or "CHILLED" or "FROZEN") || ids.Length > 100 || ids.Any(x => x <= 0) || ids.Distinct().Count() != ids.Length)
            return BadRequest(new { message = "請檢查商品、價格、庫存及配送設定。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var shared = new NpgsqlCommand("select uses_shared_inventory from cmepms.product where id=@id", Connection, tx)) { shared.Parameters.AddWithValue("id", id); if ((await shared.ExecuteScalarAsync(ct)) is true) return Conflict(new { message = "請透過商品規格介面編輯此商品。" }); }
        await using (var product = new NpgsqlCommand("select category_id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", id); var existingCategory = await product.ExecuteScalarAsync(ct); if (existingCategory is null) return NotFound(); if ((long)existingCategory != p.CategoryId) return Conflict(new { message = "商品建立後不可變更主分類或次分類，請重新建立商品。" }); }
        await using (var sku = new NpgsqlCommand("select stock_qty,image_key from cmepms.product_sku where id=@sku and product_id=@product for update", Connection, tx)) { sku.Parameters.AddWithValue("sku", input.SkuId); sku.Parameters.AddWithValue("product", id); await using var r = await sku.ExecuteReaderAsync(ct); if (!await r.ReadAsync(ct)) return NotFound(); var oldImage = r.IsDBNull(1) ? null : r.GetString(1); if (r.GetInt32(0) != s.ExpectedStockQty.Value || !string.Equals(oldImage ?? "", s.ImageKey?.Trim() ?? "", StringComparison.Ordinal)) return Conflict(new { message = "規格庫存或圖片已變更，請重新載入。" }); }
        if (s.IsActive) { await using var count = new NpgsqlCommand("select count(*) from cmepms.product_sku where product_id=@product and id<>@sku and is_active", Connection, tx); count.Parameters.AddWithValue("product", id); count.Parameters.AddWithValue("sku", input.SkuId); if ((long)(await count.ExecuteScalarAsync(ct))! > 0) return Conflict(new { message = "請先停用其他規格，再切換為單一規格。" }); }
        if (s.TaxTypeId.HasValue) { await using var tax = new NpgsqlCommand("select exists(select 1 from cmepms.tax_type where id=@id and is_active)", Connection, tx); tax.Parameters.AddWithValue("id", s.TaxTypeId.Value); if (!(bool)(await tax.ExecuteScalarAsync(ct))!) return BadRequest(new { message = "稅別不存在或已停用。" }); }
        if (ids.Length > 0) { await using var shipping = new NpgsqlCommand("select count(*) from cmepms.shipping_method where id=any(@ids) and temperature_zone=@zone and is_active", Connection, tx); shipping.Parameters.AddWithValue("ids", ids); shipping.Parameters.AddWithValue("zone", zone); if ((long)(await shipping.ExecuteScalarAsync(ct))! != ids.Length) return BadRequest(new { message = "物流未啟用或配送溫層不相符。" }); }
        await using (var update = new NpgsqlCommand("update cmepms.product_sku set price=@price,original_price=@original,stock_qty=@stock,is_active=@active,barcode=@barcode,tax_type_id=@tax,temperature_zone=@zone,upd_date=now() where id=@sku and product_id=@product", Connection, tx)) { update.Parameters.AddWithValue("price", s.Price); update.Parameters.Add("original", NpgsqlTypes.NpgsqlDbType.Numeric).Value = (object?)s.OriginalPrice ?? DBNull.Value; update.Parameters.AddWithValue("stock", s.StockQty); update.Parameters.AddWithValue("active", s.IsActive); update.Parameters.Add("barcode", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(s.Barcode) ? DBNull.Value : s.Barcode.Trim(); update.Parameters.Add("tax", NpgsqlTypes.NpgsqlDbType.Bigint).Value = (object?)s.TaxTypeId ?? DBNull.Value; update.Parameters.AddWithValue("zone", zone); update.Parameters.AddWithValue("sku", input.SkuId); update.Parameters.AddWithValue("product", id); await update.ExecuteNonQueryAsync(ct); }
        await using (var clear = new NpgsqlCommand("delete from cmepms.sku_shipping_method where sku_id=@id", Connection, tx)) { clear.Parameters.AddWithValue("id", input.SkuId); await clear.ExecuteNonQueryAsync(ct); }
        foreach (var shippingId in ids) { await using var link = new NpgsqlCommand("insert into cmepms.sku_shipping_method(sku_id,shipping_method_id) values(@sku,@shipping)", Connection, tx); link.Parameters.AddWithValue("sku", input.SkuId); link.Parameters.AddWithValue("shipping", shippingId); await link.ExecuteNonQueryAsync(ct); }
        await using (var product = new NpgsqlCommand("update cmepms.product set category_id=@category,product_name=@name,description=@description,status=@status,video_url=@video,variation_name=@variation,variation_mode='SINGLE',upd_date=now() where id=@id and exists(select 1 from cmepms.product_category where id=@category and is_active) returning id", Connection, tx)) { product.Parameters.AddWithValue("category", p.CategoryId); product.Parameters.AddWithValue("name", name); product.Parameters.AddWithValue("description", p.Description.Trim()); product.Parameters.AddWithValue("status", p.Status!); product.Parameters.Add("video", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(video) ? DBNull.Value : video; product.Parameters.Add("variation", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(p.VariationName) ? DBNull.Value : p.VariationName.Trim(); product.Parameters.AddWithValue("id", id); if (await product.ExecuteScalarAsync(ct) is null) return BadRequest(new { message = "商品分類不存在或已停用。" }); }
        if (p.Status == "ACTIVE" && !await CanPublish(id, tx, ct)) return Conflict(new { message = "請先為啟用規格設定有效稅別及可用物流，才能上架。" });
        await tx.CommitAsync(ct); return Ok(new { id });
    }

    [HttpPatch("products/{id:long}/status")]
    public async Task<IActionResult> ChangeProductStatus(long id, ProductStatusInput input, CancellationToken ct)
    {
        if (input.Status is not ("ACTIVE" or "INACTIVE")) return BadRequest(new { message = "商品狀態不正確。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var product = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", id); if (await product.ExecuteScalarAsync(ct) is null) return NotFound(); }
        if (input.Status == "ACTIVE" && !await CanPublish(id, tx, ct)) return Conflict(new { message = "請先為啟用規格設定有效稅別及可用物流，才能上架。" });
        await using var cmd = new NpgsqlCommand("update cmepms.product set status=@status,upd_date=now() where id=@id", Connection, tx);
        cmd.Parameters.AddWithValue("id", id); cmd.Parameters.AddWithValue("status", input.Status);
        await cmd.ExecuteNonQueryAsync(ct); await tx.CommitAsync(ct); return NoContent();
    }

    private async Task<bool> CanPublish(long productId, NpgsqlTransaction tx, CancellationToken ct)
    {
        const string sql = """
          select exists(select 1 from cmepms.product_sku s where s.product_id=@product and s.is_active)
            and not exists(select 1 from cmepms.product_sku s left join cmepms.tax_type t on t.id=s.tax_type_id
              where s.product_id=@product and s.is_active and (t.id is null or not t.is_active or not exists(
                select 1 from cmepms.shipping_method m where m.is_active and m.temperature_zone=coalesce(s.temperature_zone,'AMBIENT')
                 and (not exists(select 1 from cmepms.sku_shipping_method x where x.sku_id=s.id) or exists(select 1 from cmepms.sku_shipping_method x where x.sku_id=s.id and x.shipping_method_id=m.id)))))
          """;
        await using var cmd = new NpgsqlCommand(sql, Connection, tx); cmd.Parameters.AddWithValue("product", productId); return (bool)(await cmd.ExecuteScalarAsync(ct))!;
    }

    [HttpDelete("products/{id:long}")]
    public async Task<IActionResult> DeleteProduct(long id, CancellationToken ct)
    {
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var product = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", id); if (await product.ExecuteScalarAsync(ct) is null) return NotFound(); }
        var keys = new List<string>(); await using (var skus = new NpgsqlCommand("select image_key from cmepms.product_sku where product_id=@id order by id for update", Connection, tx)) { skus.Parameters.AddWithValue("id", id); await using var r = await skus.ExecuteReaderAsync(ct); while (await r.ReadAsync(ct)) if (!r.IsDBNull(0)) keys.Add(r.GetString(0)); }
        await using (var history = new NpgsqlCommand("select exists(select 1 from cmepms.order_item i join cmepms.product_sku s on s.id=i.sku_id where s.product_id=@id),exists(select 1 from cmepms.order_item i join cmepms.product_sku s on s.id=i.sku_id join cmepms.orders o on o.id=i.order_id where s.product_id=@id and o.order_status<>'CANCELLED')", Connection, tx))
        {
            history.Parameters.AddWithValue("id", id); bool hasHistory; bool hasActiveOrders;
            await using (var reader = await history.ExecuteReaderAsync(ct)) { await reader.ReadAsync(ct); hasHistory = reader.GetBoolean(0); hasActiveOrders = reader.GetBoolean(1); }
            if (hasActiveOrders) return Conflict(new { message = "此商品有未取消的訂單，請先取消訂單。" });
            if (hasHistory) { await using var softDelete = new NpgsqlCommand("update cmepms.product set is_deleted=true,status='INACTIVE',upd_date=now() where id=@id", Connection, tx); softDelete.Parameters.AddWithValue("id", id); await softDelete.ExecuteNonQueryAsync(ct); await tx.CommitAsync(ct); return Ok(new { cleanupFailed = false }); }
        }
        try
        {
            await using (var pictures = new NpgsqlCommand("delete from cmepms.product_image where product_id=@id returning object_key", Connection, tx)) { pictures.Parameters.AddWithValue("id", id); await using var r = await pictures.ExecuteReaderAsync(ct); while (await r.ReadAsync(ct)) keys.Add(r.GetString(0)); }
            await using (var links = new NpgsqlCommand("delete from cmepms.sku_shipping_method where sku_id in (select id from cmepms.product_sku where product_id=@id)", Connection, tx)) { links.Parameters.AddWithValue("id", id); await links.ExecuteNonQueryAsync(ct); }
            await using (var skus = new NpgsqlCommand("delete from cmepms.product_sku where product_id=@id", Connection, tx)) { skus.Parameters.AddWithValue("id", id); await skus.ExecuteNonQueryAsync(ct); }
            await using (var inventory = new NpgsqlCommand("delete from cmepms.product_inventory where product_id=@id", Connection, tx)) { inventory.Parameters.AddWithValue("id", id); await inventory.ExecuteNonQueryAsync(ct); }
            await using (var total = new NpgsqlCommand("delete from cmepms.product_inventory_total where product_id=@id", Connection, tx)) { total.Parameters.AddWithValue("id", id); await total.ExecuteNonQueryAsync(ct); }
            await using (var product = new NpgsqlCommand("delete from cmepms.product where id=@id", Connection, tx)) { product.Parameters.AddWithValue("id", id); await product.ExecuteNonQueryAsync(ct); }
            foreach (var key in keys.Distinct()) await StorageCleanupService.Queue(Connection, tx, key, ct);
            await tx.CommitAsync(ct);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation) { return Conflict(new { message = "此商品已有關聯紀錄，請使用下架保留歷史資料。" }); }
        return Ok(new { cleanupFailed = false });
    }

    [HttpGet("products/{productId:long}/skus")]
    public async Task<IActionResult> Skus(long productId, CancellationToken ct)
    {
        await Connection.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("select s.id,s.sku_no,s.sku_name,s.price,s.stock_qty,s.is_active,s.original_price,s.barcode,s.image_key,s.tax_type_id,coalesce(s.temperature_zone,'AMBIENT'),array(select shipping_method_id from cmepms.sku_shipping_method m where m.sku_id=s.id order by shipping_method_id) from cmepms.product_sku s where s.product_id=@product and not s.is_deleted order by s.id", Connection);
        cmd.Parameters.AddWithValue("product", productId);
        await using var reader = await cmd.ExecuteReaderAsync(ct); var items = new List<object>();
        while (await reader.ReadAsync(ct)) items.Add(new { id = reader.GetInt64(0), skuNo = reader.GetString(1), skuName = reader.GetString(2), price = reader.GetDecimal(3), stockQty = reader.GetInt32(4), isActive = reader.GetBoolean(5), originalPrice = reader.IsDBNull(6) ? (decimal?)null : reader.GetDecimal(6), barcode = reader.IsDBNull(7) ? null : reader.GetString(7), imageKey = reader.IsDBNull(8) ? null : reader.GetString(8), imageUrl = reader.IsDBNull(8) ? null : imageService.ResolveUrl(reader.GetString(8)), taxTypeId = reader.IsDBNull(9) ? (long?)null : reader.GetInt64(9), temperatureZone = reader.GetString(10), shippingMethodIds = reader.GetFieldValue<long[]>(11) });
        return Ok(items);
    }

    [HttpPost("products/{productId:long}/skus")]
    [HttpPut("products/{productId:long}/skus/{skuId:long}")]
    public async Task<IActionResult> SaveSku(long productId, long? skuId, SkuInput input, CancellationToken ct)
    {
        var no = skuId is null ? "S" + Guid.NewGuid().ToString("N").ToUpperInvariant() : input.SkuNo?.Trim(); var name = input.SkuName?.Trim();
        var zone = input.TemperatureZone ?? "AMBIENT"; var shippingIds = input.ShippingMethodIds ?? [];
        if (string.IsNullOrWhiteSpace(no) || no.Length > 40 || string.IsNullOrWhiteSpace(name) || name.Length > 100 || input.Price < 0 || input.Price > 9999999999.99m || decimal.Round(input.Price, 2) != input.Price || input.StockQty < 0 || (skuId.HasValue && input.ExpectedStockQty is null) || input.OriginalPrice is < 0 or > 9999999999.99m || (input.OriginalPrice.HasValue && decimal.Round(input.OriginalPrice.Value, 2) != input.OriginalPrice.Value) || (input.Barcode?.Length ?? 0) > 100 || (!string.IsNullOrWhiteSpace(input.ImageKey) && !SafeImageKey(input.ImageKey.Trim())) || zone is not ("AMBIENT" or "CHILLED" or "FROZEN") || shippingIds.Length > 100 || shippingIds.Any(x => x <= 0) || shippingIds.Distinct().Count() != shippingIds.Length)
            return BadRequest(new { message = "請檢查規格名稱、價格與庫存。" });
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        string mode; bool productActive; await using (var product = new NpgsqlCommand("select variation_mode,status,uses_shared_inventory from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); await using var r = await product.ExecuteReaderAsync(ct); if (!await r.ReadAsync(ct)) return NotFound(); mode = r.GetString(0); productActive = r.GetString(1) == "ACTIVE"; if (r.GetBoolean(2)) return Conflict(new { message = "請透過商品規格介面調整共用庫存。" }); }
        if (mode == "SINGLE" && input.IsActive) { await using var count = new NpgsqlCommand("select count(*) from cmepms.product_sku where product_id=@product and is_active and (@id is null or id<>@id)", Connection, tx); count.Parameters.AddWithValue("product", productId); count.Parameters.Add("id", NpgsqlTypes.NpgsqlDbType.Bigint).Value = (object?)skuId ?? DBNull.Value; if ((long)(await count.ExecuteScalarAsync(ct))! > 0) return Conflict(new { message = "單一規格商品只能有一個啟用規格。" }); }
        string? previousImage = null; if (skuId.HasValue) { await using var previous = new NpgsqlCommand("select image_key from cmepms.product_sku where id=@id and product_id=@product for update", Connection, tx); previous.Parameters.AddWithValue("id", skuId.Value); previous.Parameters.AddWithValue("product", productId); await using var r = await previous.ExecuteReaderAsync(ct); if (!await r.ReadAsync(ct)) return NotFound(); previousImage = r.IsDBNull(0) ? null : r.GetString(0); }
        if (skuId.HasValue) { await using var check = new NpgsqlCommand("select exists(select 1 from cmepms.product_sku s join cmepms.order_item i on i.sku_id=s.id join cmepms.orders o on o.id=i.order_id where s.id=@id and o.order_status<>'CANCELLED' and s.sku_name<>@name)", Connection, tx); check.Parameters.AddWithValue("id", skuId.Value); check.Parameters.AddWithValue("name", name); if ((bool)(await check.ExecuteScalarAsync(ct))!) return Conflict(new { message = "此規格有未取消的訂單，請先取消訂單。" }); }
        await using (var duplicate = new NpgsqlCommand("select exists(select 1 from cmepms.product_sku where product_id=@product and lower(sku_name)=lower(@name) and (@id is null or id<>@id))", Connection, tx)) { duplicate.Parameters.AddWithValue("product", productId); duplicate.Parameters.AddWithValue("name", name); duplicate.Parameters.Add("id", NpgsqlTypes.NpgsqlDbType.Bigint).Value = (object?)skuId ?? DBNull.Value; if ((bool)(await duplicate.ExecuteScalarAsync(ct))!) return Conflict(new { message = "商品已有相同名稱的規格。" }); }
        if (!string.IsNullOrWhiteSpace(input.ImageKey) && imageService.IsOwnedKey(input.ImageKey.Trim())) { if (!skuId.HasValue) return BadRequest(new { message = "請直接上傳規格圖片。" }); await using var own = new NpgsqlCommand("select exists(select 1 from cmepms.product_sku where id=@id and product_id=@product and image_key=@key)", Connection, tx); own.Parameters.AddWithValue("id", skuId.Value); own.Parameters.AddWithValue("product", productId); own.Parameters.AddWithValue("key", input.ImageKey.Trim()); if (!(bool)(await own.ExecuteScalarAsync(ct))!) return Conflict(new { message = "規格圖片已變更，請重新載入。" }); }
        if (input.TaxTypeId.HasValue) { await using var tax = new NpgsqlCommand("select exists(select 1 from cmepms.tax_type where id=@id and is_active)", Connection, tx); tax.Parameters.AddWithValue("id", input.TaxTypeId.Value); if (!(bool)(await tax.ExecuteScalarAsync(ct))!) return BadRequest(new { message = "稅別不存在或已停用。" }); }
        if (shippingIds.Length > 0) { await using var ship = new NpgsqlCommand("select count(*) from cmepms.shipping_method where id=any(@ids) and temperature_zone=@zone and is_active", Connection, tx); ship.Parameters.AddWithValue("ids", shippingIds); ship.Parameters.AddWithValue("zone", zone); if ((long)(await ship.ExecuteScalarAsync(ct))! != shippingIds.Length) return BadRequest(new { message = "選擇的物流未啟用或溫層不相符。" }); }
        var sql = skuId is null
            ? "insert into cmepms.product_sku(product_id,sku_no,sku_name,price,stock_qty,is_active,original_price,barcode,image_key,tax_type_id,temperature_zone) values(@product,@no,@name,@price,@stock,@active,@original,@barcode,@image,@tax,@zone) returning id"
            : "update cmepms.product_sku set sku_no=@no,sku_name=@name,price=@price,stock_qty=@stock,is_active=@active,original_price=@original,barcode=@barcode,image_key=@image,tax_type_id=@tax,temperature_zone=@zone,upd_date=now() where id=@id and product_id=@product and stock_qty=@expected returning id";
        await using var cmd = new NpgsqlCommand(sql, Connection, tx);
        cmd.Parameters.AddWithValue("product", productId); cmd.Parameters.AddWithValue("no", no); cmd.Parameters.AddWithValue("name", name); cmd.Parameters.AddWithValue("price", input.Price); cmd.Parameters.AddWithValue("stock", input.StockQty); cmd.Parameters.AddWithValue("active", input.IsActive);
        cmd.Parameters.Add("original", NpgsqlTypes.NpgsqlDbType.Numeric).Value = (object?)input.OriginalPrice ?? DBNull.Value;
        cmd.Parameters.Add("barcode", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(input.Barcode) ? DBNull.Value : input.Barcode.Trim();
        cmd.Parameters.Add("image", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(input.ImageKey) ? DBNull.Value : input.ImageKey.Trim();
        cmd.Parameters.Add("tax", NpgsqlTypes.NpgsqlDbType.Bigint).Value = (object?)input.TaxTypeId ?? DBNull.Value; cmd.Parameters.AddWithValue("zone", zone);
        if (skuId.HasValue) { cmd.Parameters.AddWithValue("id", skuId.Value); cmd.Parameters.AddWithValue("expected", input.ExpectedStockQty!.Value); }
        try { var result = await cmd.ExecuteScalarAsync(ct); if (result is null) return Conflict(new { message = "規格不存在或庫存已變更，請重新載入後再編輯。" }); var savedId = (long)result; await using (var clear = new NpgsqlCommand("delete from cmepms.sku_shipping_method where sku_id=@id", Connection, tx)) { clear.Parameters.AddWithValue("id", savedId); await clear.ExecuteNonQueryAsync(ct); } foreach (var shippingId in shippingIds) { await using var add = new NpgsqlCommand("insert into cmepms.sku_shipping_method(sku_id,shipping_method_id) values(@sku,@shipping)", Connection, tx); add.Parameters.AddWithValue("sku", savedId); add.Parameters.AddWithValue("shipping", shippingId); await add.ExecuteNonQueryAsync(ct); } if (productActive && !await CanPublish(productId, tx, ct)) return Conflict(new { message = "上架商品需保有啟用規格，且所有啟用規格都要有有效稅別和可用物流。" }); if (previousImage != input.ImageKey?.Trim()) await StorageCleanupService.Queue(Connection, tx, previousImage, ct); await tx.CommitAsync(ct); return Ok(new { id = savedId }); }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.ForeignKeyViolation) { return Conflict(new { message = "規格資料發生衝突或商品不存在，請重新載入後再試。" }); }
    }

    [HttpPost("products/{productId:long}/skus/batch")]
    public async Task<IActionResult> CreateSkuBatch(long productId, BatchSkuInput batch, CancellationToken ct)
    {
        var items = batch.Items;
        if (items is null || items.Count is < 1 or > 100 || items.Any(i => string.IsNullOrWhiteSpace(i.SkuName) || i.SkuName.Trim().Length > 100 || i.Price < 0 || i.Price > 9999999999.99m || decimal.Round(i.Price, 2) != i.Price || i.StockQty < 0 || i.OriginalPrice is < 0 or > 9999999999.99m || (i.OriginalPrice.HasValue && decimal.Round(i.OriginalPrice.Value, 2) != i.OriginalPrice.Value) || (i.Barcode?.Length ?? 0) > 100 || !string.IsNullOrWhiteSpace(i.ImageKey) || i.TemperatureZone is not ("AMBIENT" or "CHILLED" or "FROZEN") || (i.ShippingMethodIds?.Length ?? 0) > 100 || (i.ShippingMethodIds ?? []).Any(x => x <= 0) || (i.ShippingMethodIds ?? []).Distinct().Count() != (i.ShippingMethodIds?.Length ?? 0)) || items.Select(i => i.SkuName!.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != items.Count)
            return BadRequest(new { message = "請檢查規格名稱、售價、原價、庫存及物流設定。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        string mode; bool productActive; await using (var product = new NpgsqlCommand("select variation_mode,status,uses_shared_inventory from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); await using var r = await product.ExecuteReaderAsync(ct); if (!await r.ReadAsync(ct)) return NotFound(); mode = r.GetString(0); productActive = r.GetString(1) == "ACTIVE"; if (r.GetBoolean(2)) return Conflict(new { message = "請透過商品規格介面調整共用庫存。" }); }
        if (mode == "SINGLE") { await using var count = new NpgsqlCommand("select count(*) from cmepms.product_sku where product_id=@id and is_active", Connection, tx); count.Parameters.AddWithValue("id", productId); if ((long)(await count.ExecuteScalarAsync(ct))! + items.Count(i => i.IsActive) > 1) return Conflict(new { message = "請先將商品設定為多規格。" }); }
        foreach (var item in items)
        {
            await using (var existing = new NpgsqlCommand("select exists(select 1 from cmepms.product_sku where product_id=@id and lower(sku_name)=lower(@name))", Connection, tx)) { existing.Parameters.AddWithValue("id", productId); existing.Parameters.AddWithValue("name", item.SkuName!.Trim()); if ((bool)(await existing.ExecuteScalarAsync(ct))!) return Conflict(new { message = "商品已有相同名稱的規格，請修改後再試。" }); }
            if (item.TaxTypeId.HasValue) { await using var tax = new NpgsqlCommand("select exists(select 1 from cmepms.tax_type where id=@id and is_active)", Connection, tx); tax.Parameters.AddWithValue("id", item.TaxTypeId.Value); if (!(bool)(await tax.ExecuteScalarAsync(ct))!) return BadRequest(new { message = "稅別不存在或已停用。" }); }
            var ids = item.ShippingMethodIds ?? []; if (ids.Length > 0) { await using var methods = new NpgsqlCommand("select count(*) from cmepms.shipping_method where id=any(@ids) and temperature_zone=@zone and is_active", Connection, tx); methods.Parameters.AddWithValue("ids", ids); methods.Parameters.AddWithValue("zone", item.TemperatureZone!); if ((long)(await methods.ExecuteScalarAsync(ct))! != ids.Length) return BadRequest(new { message = "物流未啟用或配送溫層不相符。" }); }
        }
        var created = new List<long>();
        try { foreach (var item in items) { await using var add = new NpgsqlCommand("insert into cmepms.product_sku(product_id,sku_no,sku_name,price,stock_qty,is_active,original_price,barcode,tax_type_id,temperature_zone) values(@product,@no,@name,@price,@stock,@active,@original,@barcode,@tax,@zone) returning id", Connection, tx); add.Parameters.AddWithValue("product", productId); add.Parameters.AddWithValue("no", "S" + Guid.NewGuid().ToString("N").ToUpperInvariant()); add.Parameters.AddWithValue("name", item.SkuName!.Trim()); add.Parameters.AddWithValue("price", item.Price); add.Parameters.AddWithValue("stock", item.StockQty); add.Parameters.AddWithValue("active", item.IsActive); add.Parameters.Add("original", NpgsqlTypes.NpgsqlDbType.Numeric).Value = (object?)item.OriginalPrice ?? DBNull.Value; add.Parameters.Add("barcode", NpgsqlTypes.NpgsqlDbType.Varchar).Value = string.IsNullOrWhiteSpace(item.Barcode) ? DBNull.Value : item.Barcode.Trim(); add.Parameters.Add("tax", NpgsqlTypes.NpgsqlDbType.Bigint).Value = (object?)item.TaxTypeId ?? DBNull.Value; add.Parameters.AddWithValue("zone", item.TemperatureZone!); var sku = (long)(await add.ExecuteScalarAsync(ct))!; created.Add(sku); foreach (var shippingId in item.ShippingMethodIds ?? []) { await using var link = new NpgsqlCommand("insert into cmepms.sku_shipping_method(sku_id,shipping_method_id) values(@sku,@shipping)", Connection, tx); link.Parameters.AddWithValue("sku", sku); link.Parameters.AddWithValue("shipping", shippingId); await link.ExecuteNonQueryAsync(ct); } } if (productActive && !await CanPublish(productId, tx, ct)) return Conflict(new { message = "上架商品的所有啟用規格都要有有效稅別和可用物流。" }); await tx.CommitAsync(ct); return Ok(new { ids = created }); }
        catch (PostgresException e) when (e.SqlState is PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.ForeignKeyViolation) { return Conflict(new { message = "規格資料發生衝突，請重新載入後再試。" }); }
    }

    [HttpPut("products/{productId:long}/skus/batch")]
    public async Task<IActionResult> UpdateSkuBatch(long productId, SkuPriceBatch batch, CancellationToken ct)
    {
        var items = batch.Items; if (items is null || items.Count is < 1 or > 100 || items.Select(x => x.Id).Distinct().Count() != items.Count || items.Any(i => i.Id <= 0 || i.Price < 0 || i.Price > 9999999999.99m || decimal.Round(i.Price, 2) != i.Price || i.OriginalPrice is < 0 or > 9999999999.99m || (i.OriginalPrice.HasValue && decimal.Round(i.OriginalPrice.Value, 2) != i.OriginalPrice.Value) || i.StockQty < 0 || i.ExpectedStockQty < 0)) return BadRequest(new { message = "請檢查售價、原價與庫存。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        string mode; bool productActive; await using (var product = new NpgsqlCommand("select variation_mode,status,uses_shared_inventory from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); await using var r = await product.ExecuteReaderAsync(ct); if (!await r.ReadAsync(ct)) return NotFound(); mode = r.GetString(0); productActive = r.GetString(1) == "ACTIVE"; if (r.GetBoolean(2)) return Conflict(new { message = "請透過商品規格介面調整共用庫存。" }); }
        foreach (var item in items.OrderBy(x => x.Id)) { await using var update = new NpgsqlCommand("update cmepms.product_sku set price=@price,original_price=@original,stock_qty=@stock,is_active=@active,upd_date=now() where id=@id and product_id=@product and stock_qty=@expected returning id", Connection, tx); update.Parameters.AddWithValue("price", item.Price); update.Parameters.Add("original", NpgsqlTypes.NpgsqlDbType.Numeric).Value = (object?)item.OriginalPrice ?? DBNull.Value; update.Parameters.AddWithValue("stock", item.StockQty); update.Parameters.AddWithValue("active", item.IsActive); update.Parameters.AddWithValue("id", item.Id); update.Parameters.AddWithValue("product", productId); update.Parameters.AddWithValue("expected", item.ExpectedStockQty); if (await update.ExecuteScalarAsync(ct) is null) return Conflict(new { message = "規格或庫存已變更，請重新載入後再試。" }); }
        if (mode == "SINGLE") { await using var count = new NpgsqlCommand("select count(*) from cmepms.product_sku where product_id=@id and is_active", Connection, tx); count.Parameters.AddWithValue("id", productId); if ((long)(await count.ExecuteScalarAsync(ct))! > 1) return Conflict(new { message = "單一規格商品只能有一個啟用規格。" }); }
        if (productActive && !await CanPublish(productId, tx, ct)) return Conflict(new { message = "上架商品需保有啟用規格，且所有啟用規格都要有有效稅別和可用物流。" });
        await tx.CommitAsync(ct); return NoContent();
    }

    [HttpGet("products/{productId:long}/images")]
    public async Task<IActionResult> Images(long productId, CancellationToken ct)
    {
        await Connection.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("select id,object_key,sort_order,is_main,alt_text from cmepms.product_image where product_id=@product order by sort_order,id", Connection);
        cmd.Parameters.AddWithValue("product", productId);
        await using var reader = await cmd.ExecuteReaderAsync(ct); var items = new List<object>();
        while (await reader.ReadAsync(ct)) items.Add(new { id = reader.GetInt64(0), objectKey = reader.GetString(1), url = imageService.ResolveUrl(reader.GetString(1)), sortOrder = reader.GetInt32(2), isMain = reader.GetBoolean(3), altText = reader.IsDBNull(4) ? null : reader.GetString(4) });
        return Ok(items);
    }

    [HttpPost("products/{productId:long}/images")]
    public async Task<IActionResult> AddImage(long productId, ImageInput input, CancellationToken ct)
    {
        var key = input.ObjectKey?.Trim();
        if (string.IsNullOrWhiteSpace(key) || !SafeImageKey(key) || imageService.IsOwnedKey(key) || (input.AltText?.Length ?? 0) > 200)
            return BadRequest(new { message = "請輸入 HTTPS 圖片網址或安全的相對路徑。" });
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var product = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); if (await product.ExecuteScalarAsync(ct) is null) return NotFound(); }
        await using (var count = new NpgsqlCommand("select count(*) from cmepms.product_image where product_id=@id", Connection, tx)) { count.Parameters.AddWithValue("id", productId); if ((long)(await count.ExecuteScalarAsync(ct))! >= 20) return BadRequest(new { message = "每個商品最多可設定 20 張圖片。" }); }
        if (input.IsMain) { await using var reset = new NpgsqlCommand("update cmepms.product_image set is_main=false,upd_date=now() where product_id=@product and is_main", Connection, tx); reset.Parameters.AddWithValue("product", productId); await reset.ExecuteNonQueryAsync(ct); }
        await using var cmd = new NpgsqlCommand("insert into cmepms.product_image(product_id,object_key,sort_order,is_main,alt_text) values(@product,@key,@sort,@main,@alt) returning id", Connection, tx);
        cmd.Parameters.AddWithValue("product", productId); cmd.Parameters.AddWithValue("key", key); cmd.Parameters.AddWithValue("sort", input.SortOrder); cmd.Parameters.AddWithValue("main", input.IsMain); cmd.Parameters.Add("alt", NpgsqlTypes.NpgsqlDbType.Varchar).Value = (object?)input.AltText?.Trim() ?? DBNull.Value;
        try { var id = (long)(await cmd.ExecuteScalarAsync(ct))!; await tx.CommitAsync(ct); return Ok(new { id }); }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation) { return Conflict(new { message = "圖片路徑已存在。" }); }
    }

    [HttpPost("products/{productId:long}/images/upload"), RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(long productId, [FromForm] IFormFile? file, CancellationToken ct)
    {
        if (file is null) return BadRequest(new { message = "請選擇圖片。" });
        try
        {
            var normalized = await imageService.Normalize(file, ct); await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
            await using (var product = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); if (await product.ExecuteScalarAsync(ct) is null) return NotFound(); }
            await using var count = new NpgsqlCommand("select count(*),coalesce(max(sort_order),-1)+1 from cmepms.product_image where product_id=@id", Connection, tx); count.Parameters.AddWithValue("id", productId); long existing; int sort;
            await using (var r = await count.ExecuteReaderAsync(ct)) { await r.ReadAsync(ct); existing = r.GetInt64(0); sort = r.GetInt32(1); }
            if (existing >= 20) return BadRequest(new { message = "每個商品最多可設定 20 張圖片。" });
            var key = imageService.NewKey(productId);
            await using (var data = new NpgsqlCommand("insert into cmepms.product_image_data(object_key,content_type,image_data) values(@key,@type,@data)", Connection, tx)) { data.Parameters.AddWithValue("key", key); data.Parameters.AddWithValue("type", normalized.ContentType); data.Parameters.AddWithValue("data", normalized.Bytes); await data.ExecuteNonQueryAsync(ct); }
            await using var insert = new NpgsqlCommand("insert into cmepms.product_image(product_id,object_key,sort_order,is_main) values(@id,@key,@sort,@main) returning id", Connection, tx); insert.Parameters.AddWithValue("id", productId); insert.Parameters.AddWithValue("key", key); insert.Parameters.AddWithValue("sort", sort); insert.Parameters.AddWithValue("main", existing == 0); var id = (long)(await insert.ExecuteScalarAsync(ct))!;
            await tx.CommitAsync(ct); return Ok(new { id, url = imageService.ResolveUrl(key) });
        }
        catch (ArgumentException e) { return BadRequest(new { message = e.Message }); }
    }

    [HttpPut("products/{productId:long}/images/{imageId:long}/main")]
    public async Task<IActionResult> SetMainImage(long productId, long imageId, CancellationToken ct)
    {
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var p = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { p.Parameters.AddWithValue("id", productId); if (await p.ExecuteScalarAsync(ct) is null) return NotFound(); }
        await using (var exists = new NpgsqlCommand("select exists(select 1 from cmepms.product_image where id=@image and product_id=@product)", Connection, tx)) { exists.Parameters.AddWithValue("image", imageId); exists.Parameters.AddWithValue("product", productId); if (!(bool)(await exists.ExecuteScalarAsync(ct))!) return NotFound(); }
        await using (var clear = new NpgsqlCommand("update cmepms.product_image set is_main=false,upd_date=now() where product_id=@product and is_main", Connection, tx)) { clear.Parameters.AddWithValue("product", productId); await clear.ExecuteNonQueryAsync(ct); }
        await using (var set = new NpgsqlCommand("update cmepms.product_image set is_main=true,upd_date=now() where id=@image and product_id=@product", Connection, tx)) { set.Parameters.AddWithValue("image", imageId); set.Parameters.AddWithValue("product", productId); await set.ExecuteNonQueryAsync(ct); }
        await tx.CommitAsync(ct); return NoContent();
    }

    [HttpPut("products/{productId:long}/images/order")]
    public async Task<IActionResult> OrderImages(long productId, ImageOrderInput input, CancellationToken ct)
    {
        var ids = input.ImageIds; if (ids is null || ids.Length > 20 || ids.Any(x => x <= 0) || ids.Distinct().Count() != ids.Length) return BadRequest(new { message = "圖片排序資料不正確。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var product = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); if (await product.ExecuteScalarAsync(ct) is null) return NotFound(); }
        var existing = new List<long>(); await using (var check = new NpgsqlCommand("select id from cmepms.product_image where product_id=@product for update", Connection, tx)) { check.Parameters.AddWithValue("product", productId); await using var r = await check.ExecuteReaderAsync(ct); while (await r.ReadAsync(ct)) existing.Add(r.GetInt64(0)); }
        if (existing.Count != ids.Length || !existing.Order().SequenceEqual(ids.Order())) return Conflict(new { message = "圖片清單已變更，請重新載入再排序。" });
        for (var i = 0; i < ids.Length; i++) { await using var update = new NpgsqlCommand("update cmepms.product_image set sort_order=@sort,upd_date=now() where product_id=@product and id=@id", Connection, tx); update.Parameters.AddWithValue("sort", i); update.Parameters.AddWithValue("product", productId); update.Parameters.AddWithValue("id", ids[i]); await update.ExecuteNonQueryAsync(ct); }
        await tx.CommitAsync(ct); return NoContent();
    }

    [HttpDelete("products/{productId:long}/images/{imageId:long}")]
    public async Task<IActionResult> DeleteImage(long productId, long imageId, CancellationToken ct)
    {
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var product = new NpgsqlCommand("select id from cmepms.product where id=@id for update", Connection, tx)) { product.Parameters.AddWithValue("id", productId); if (await product.ExecuteScalarAsync(ct) is null) return NotFound(); }
        await using var cmd = new NpgsqlCommand("delete from cmepms.product_image where id=@id and product_id=@product returning object_key,is_main", Connection, tx);
        cmd.Parameters.AddWithValue("id", imageId); cmd.Parameters.AddWithValue("product", productId); string key; bool main;
        await using (var r = await cmd.ExecuteReaderAsync(ct)) { if (!await r.ReadAsync(ct)) return NotFound(); key = r.GetString(0); main = r.GetBoolean(1); }
        if (main) { await using var promote = new NpgsqlCommand("update cmepms.product_image set is_main=true,upd_date=now() where id=(select id from cmepms.product_image where product_id=@product order by sort_order,id limit 1)", Connection, tx); promote.Parameters.AddWithValue("product", productId); await promote.ExecuteNonQueryAsync(ct); }
        await StorageCleanupService.Queue(Connection, tx, key, ct); await tx.CommitAsync(ct); return Ok(new { cleanupFailed = false });
    }

    [HttpPost("products/{productId:long}/skus/{skuId:long}/image"), RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadSkuImage(long productId, long skuId, [FromForm] IFormFile? file, CancellationToken ct)
    {
        if (file is null) return BadRequest(new { message = "請選擇圖片。" });
        try
        {
            var normalized = await imageService.Normalize(file, ct); await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
            string? old; await using (var sku = new NpgsqlCommand("select image_key from cmepms.product_sku where id=@id and product_id=@product for update", Connection, tx)) { sku.Parameters.AddWithValue("id", skuId); sku.Parameters.AddWithValue("product", productId); await using var r = await sku.ExecuteReaderAsync(ct); if (!await r.ReadAsync(ct)) return NotFound(); old = r.IsDBNull(0) ? null : r.GetString(0); }
            var key = imageService.NewKey(productId);
            await using (var data = new NpgsqlCommand("insert into cmepms.product_image_data(object_key,content_type,image_data) values(@key,@type,@data)", Connection, tx)) { data.Parameters.AddWithValue("key", key); data.Parameters.AddWithValue("type", normalized.ContentType); data.Parameters.AddWithValue("data", normalized.Bytes); await data.ExecuteNonQueryAsync(ct); }
            await using (var update = new NpgsqlCommand("update cmepms.product_sku set image_key=@key,upd_date=now() where id=@id and product_id=@product", Connection, tx)) { update.Parameters.AddWithValue("id", skuId); update.Parameters.AddWithValue("product", productId); update.Parameters.AddWithValue("key", key); await update.ExecuteNonQueryAsync(ct); }
            await StorageCleanupService.Queue(Connection, tx, old, ct); await tx.CommitAsync(ct); return Ok(new { imageKey = key, url = imageService.ResolveUrl(key), cleanupFailed = false });
        }
        catch (ArgumentException e) { return BadRequest(new { message = e.Message }); }
    }

    private static bool SafeImageKey(string key) => key.Length <= 500 && !key.Any(char.IsControl) && !key.Contains('\\') && !key.StartsWith("//") &&
        (Uri.TryCreate(key, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps || !key.Contains(':') && !key.Split('/').Contains(".."));
}
