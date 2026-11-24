using System.Security.Cryptography;
using System.Text.Json;
using LinfishAppcation.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace LinfishAppcation.Controllers;

[ApiController, Route("api/admin/inventory-products"), Authorize(Roles = "admin")]
public sealed class ProductInventoryController(AppDbContext db) : ControllerBase
{
    private NpgsqlConnection Connection => (NpgsqlConnection)db.Database.GetDbConnection();
    public sealed record SaleInput(int Units, decimal Price, decimal? SuggestedPrice, long? TaxTypeId, string? TemperatureZone, long[]? ShippingMethodIds, string? UnitKind, bool IsActive = true);
    public sealed record StockInput(Dictionary<string, JsonElement>? Attributes, int Stock, List<SaleInput>? Options);
    public sealed record CreateInput(long CategoryId, string? ProductName, string? Description, string? VideoUrl, int Total, List<StockInput>? Stocks);
    public sealed record UpdateSaleInput(long? Id, int Units, decimal Price, decimal? SuggestedPrice, long? TaxTypeId, string? TemperatureZone, long[]? ShippingMethodIds, string? UnitKind, bool IsActive = true);
    public sealed record UpdateStockInput(long? Id, int? ExpectedStock, Dictionary<string,JsonElement>? Attributes, int Stock, List<UpdateSaleInput>? Options);
    public sealed record UpdateInput(int Total, List<UpdateStockInput>? Stocks, long CategoryId, string? ProductName, string? Description, string? VideoUrl, string? Status);

    private static readonly IReadOnlyDictionary<string, string[]> Keys = new Dictionary<string, string[]> {
        ["FISI"] = ["lengthCm", "color"],
        ["AQUI"] = ["size", "cc", "watt", "litre", "foot", "singleHole", "doubleHole"],
        ["FEEI"] = ["pellet", "size", "gLargePellet", "gSmallPellet", "mlLargePellet", "mlSmallPellet", "kgLargePellet", "kgSmallPellet", "ml", "g", "kg"]
    };
    private static readonly string[] Colors = ["黑色", "紅色", "彩色", "白色", "橘色", "黃色", "藍色", "綠色"];
    private static readonly string[] Sizes = ["S", "M", "L", "XL", "XXL"];
    private static readonly string[] Pellets = ["大顆粒", "小顆粒"];
    private static bool IsSet(JsonElement value) => value.ValueKind is not (JsonValueKind.Null or JsonValueKind.Undefined);
    private static string AttributeLabel(KeyValuePair<string,object> x) => x.Key switch {
        "lengthCm"=>$"{x.Value}cm", "color" or "size" or "pellet"=>$"{x.Value}", "pack"=>$"{x.Value}包", "bottle"=>$"{x.Value}瓶",
        "largePelletPack"=>$"{x.Value}包（大顆粒）", "smallPelletPack"=>$"{x.Value}包（小顆粒）",
        "singleHole"=>$"{x.Value}型（單孔）", "doubleHole"=>$"{x.Value}型（雙孔）", "watt"=>$"{x.Value}W", "litre"=>$"{x.Value}L", "foot"=>$"{x.Value}尺",
        "gLargePellet"=>$"{x.Value}g（大顆粒）", "gSmallPellet"=>$"{x.Value}g（小顆粒）", "mlLargePellet"=>$"{x.Value}ml（大顆粒）", "mlSmallPellet"=>$"{x.Value}ml（小顆粒）",
        "kgLargePellet"=>$"{x.Value}kg（大顆粒）", "kgSmallPellet"=>$"{x.Value}kg（小顆粒）", _=>$"{x.Value}{x.Key}"
    };

    [HttpGet("{productId:long}")]
    public async Task<IActionResult> Get(long productId, CancellationToken ct)
    {
        await Connection.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("""
            select i.id,i.attributes::text,i.stock_qty,s.id,s.units_per_sale,s.price,s.original_price,s.tax_type_id,s.temperature_zone,
              array(select shipping_method_id from cmepms.sku_shipping_method where sku_id=s.id order by shipping_method_id),p.inventory_unit,s.is_active
            from cmepms.product_inventory i join cmepms.product p on p.id=i.product_id and p.uses_shared_inventory
              join cmepms.product_sku s on s.inventory_id=i.id and not s.is_deleted
            where i.product_id=@product order by i.id,s.id
            """, Connection);
        cmd.Parameters.AddWithValue("product", productId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var rows = new Dictionary<long, (Dictionary<string,JsonElement> Attributes, int Stock, List<object> Options)>();
        while (await r.ReadAsync(ct)) {
            var id = r.GetInt64(0);
            if (!rows.TryGetValue(id, out var row)) { row = (JsonSerializer.Deserialize<Dictionary<string,JsonElement>>(r.GetString(1)) ?? [],r.GetInt32(2),[]); rows.Add(id,row); }
            row.Options.Add(new { id = r.GetInt64(3), units = r.GetInt32(4), price = r.GetDecimal(5), suggestedPrice = r.IsDBNull(6) ? (decimal?)null : r.GetDecimal(6), taxTypeId = r.IsDBNull(7) ? (long?)null : r.GetInt64(7), temperatureZone = r.GetString(8), shippingMethodIds = r.GetFieldValue<long[]>(9), unitKind=r.GetString(10), isActive=r.GetBoolean(11) });
        }
        return Ok(rows.Select(x => new { id = x.Key, attributes = x.Value.Attributes, stock = x.Value.Stock, expectedStock = x.Value.Stock, options = x.Value.Options }));
    }

    [HttpPut("{productId:long}")]
    public async Task<IActionResult> Update(long productId, UpdateInput input, CancellationToken ct)
    {
        var productName=input.ProductName?.Trim();var description=input.Description?.Trim();var video=input.VideoUrl?.Trim();
        if (input.CategoryId<=0 || string.IsNullOrWhiteSpace(productName) || productName.Length>150 || string.IsNullOrWhiteSpace(description) || description.Length>10000 || input.Status is not ("DRAFT" or "ACTIVE" or "INACTIVE") || (!string.IsNullOrEmpty(video) && (video.Length>2048 || !Uri.TryCreate(video,UriKind.Absolute,out var uri) || uri.Scheme!=Uri.UriSchemeHttps)) || input.Total < 0 || input.Stocks is null || input.Stocks.Count is < 1 or > 100 || input.Stocks.Any(x => x.Stock < 0 || x.Options is null || x.Options.Count is < 1 or > 100) || input.Stocks.Sum(x => (long)x.Stock) != input.Total)
            return BadRequest(new { message = "請確認各規格庫存之和等於商品總數。" });
        if (input.Stocks.Where(x=>x.Id.HasValue).Select(x=>x.Id).Distinct().Count()!=input.Stocks.Count(x=>x.Id.HasValue)) return BadRequest(new {message="規格重複。"});
        await Connection.OpenAsync(ct); await using var tx=await Connection.BeginTransactionAsync(ct);
        string category;
        await using(var product=new NpgsqlCommand("select c.pro_no from cmepms.product p join cmepms.product_category c on c.id=p.category_id where p.id=@id and p.category_id=@category and p.uses_shared_inventory for update of p",Connection,tx)) { product.Parameters.AddWithValue("id",productId); product.Parameters.AddWithValue("category",input.CategoryId); category=(await product.ExecuteScalarAsync(ct) as string)??""; }
        if(!Keys.TryGetValue(category,out var allowed)) return NotFound();
        var unitKinds=input.Stocks.SelectMany(x=>x.Options!).Select(x=>x.UnitKind).Distinct().ToArray();
        if(unitKinds.Length!=1 || unitKinds[0] is not ("隻" or "件" or "包" or "瓶") || (category=="FISI" && unitKinds[0]!="隻") || (category!="FISI" && unitKinds[0]=="隻") || (category=="AQUI" && unitKinds[0]=="瓶"))return BadRequest(new{message="同一商品的庫存單位必須一致；包與瓶不可混用。"});
        var inventoryUnit=unitKinds[0]!;
        var saved = new Dictionary<long,(string Attributes,int Stock)>();
        await using(var query=new NpgsqlCommand("select id,attributes::text,stock_qty from cmepms.product_inventory where product_id=@id order by id for update",Connection,tx)) {query.Parameters.AddWithValue("id",productId);await using var r=await query.ExecuteReaderAsync(ct);while(await r.ReadAsync(ct))saved.Add(r.GetInt64(0),(r.GetString(1),r.GetInt32(2)));}
        var existingSku = new Dictionary<long,(long Inventory,int Units)>();
        await using(var query=new NpgsqlCommand("select id,inventory_id,units_per_sale from cmepms.product_sku where product_id=@id and not is_deleted order by id for update",Connection,tx)) {query.Parameters.AddWithValue("id",productId);await using var r=await query.ExecuteReaderAsync(ct);while(await r.ReadAsync(ct))existingSku.Add(r.GetInt64(0),(r.GetInt64(1),r.GetInt32(2)));}
        var activeSku = new HashSet<long>();
        await using(var query=new NpgsqlCommand("select distinct oi.sku_id from cmepms.order_item oi join cmepms.orders o on o.id=oi.order_id join cmepms.product_sku s on s.id=oi.sku_id where s.product_id=@id and o.order_status<>'CANCELLED'",Connection,tx)) {query.Parameters.AddWithValue("id",productId);await using var r=await query.ExecuteReaderAsync(ct);while(await r.ReadAsync(ct))activeSku.Add(r.GetInt64(0));}
        var seen = new HashSet<string>(StringComparer.Ordinal); var keptStocks=new HashSet<long>(); var keptSkus=new HashSet<long>(); bool pack=false,bottle=false;
        foreach(var row in input.Stocks) {
            var attrs=new SortedDictionary<string,object>(StringComparer.Ordinal);
            foreach(var (key,value) in row.Attributes??[]) {
                if(!IsSet(value))continue;
                if(!allowed.Contains(key))return BadRequest(new{message="規格不屬於商品分類。"});
                if(key is "color" or "size" or "pellet") {if(value.ValueKind!=JsonValueKind.String || !(key=="color"?Colors:key=="pellet"?Pellets:Sizes).Contains(value.GetString()!))return BadRequest(new{message="規格選項不正確。"});attrs.Add(key,value.GetString()!);}
                else {if(value.ValueKind!=JsonValueKind.Number || !value.TryGetDecimal(out var n) || n<=0 || n>100000000 || (key=="lengthCm" && (n<0.1m||n>500m||decimal.Round(n,1)!=n)))return BadRequest(new{message="規格數值不正確。"});attrs.Add(key,n);}
                if(key is "pack" or "largePelletPack" or "smallPelletPack")pack=true;if(key=="bottle")bottle=true;
            }
            if(pack&&bottle)return BadRequest(new{message="同一商品不可同時設定包與瓶。"});
            var json=JsonSerializer.Serialize(attrs);if(!seen.Add(json))return BadRequest(new{message="相同規格應共用一筆庫存。"});
            if(row.Options!.Select(x=>x.Units).Distinct().Count()!=row.Options!.Count || row.Options!.Any(o=>o.Units<1||o.Price<0||o.Price>9999999999.99m||decimal.Round(o.Price,2)!=o.Price||o.SuggestedPrice is <0 or >9999999999.99m||(o.SuggestedPrice.HasValue&&decimal.Round(o.SuggestedPrice.Value,2)!=o.SuggestedPrice.Value)||o.TemperatureZone is not ("AMBIENT" or "CHILLED" or "FROZEN")))return BadRequest(new{message="購買選項或價格不正確。"});
            long inventory;
            if(row.Id.HasValue) {
                inventory=row.Id.Value;if(!saved.TryGetValue(inventory,out var old)||!row.ExpectedStock.HasValue||old.Stock!=row.ExpectedStock.Value)return Conflict(new{message="庫存已變更，請重新載入。"});
                var oldAttrs=JsonSerializer.Deserialize<Dictionary<string,JsonElement>>(old.Attributes)??[];
                var oldCanonical=JsonSerializer.Serialize(new SortedDictionary<string,JsonElement>(oldAttrs,StringComparer.Ordinal));
                if(oldCanonical!=json && existingSku.Any(x=>x.Value.Inventory==inventory&&activeSku.Contains(x.Key)))return Conflict(new{message="此規格有未取消的訂單，請先取消訂單。"});
                await using var update=new NpgsqlCommand("update cmepms.product_inventory set attributes=@attributes,stock_qty=@stock,upd_date=now() where id=@id",Connection,tx);update.Parameters.Add("attributes",NpgsqlDbType.Jsonb).Value=json;update.Parameters.AddWithValue("stock",row.Stock);update.Parameters.AddWithValue("id",inventory);await update.ExecuteNonQueryAsync(ct);
            } else {
                await using var insert=new NpgsqlCommand("insert into cmepms.product_inventory(product_id,attributes,stock_qty) values(@product,@attributes,@stock) returning id",Connection,tx);insert.Parameters.AddWithValue("product",productId);insert.Parameters.Add("attributes",NpgsqlDbType.Jsonb).Value=json;insert.Parameters.AddWithValue("stock",row.Stock);inventory=(long)(await insert.ExecuteScalarAsync(ct))!;
            }
            keptStocks.Add(inventory);
            var label=attrs.Count==0?"標準規格":string.Join(" / ",attrs.Select(AttributeLabel));
            foreach(var option in row.Options) {
                var ids=option.ShippingMethodIds??[];if(ids.Any(x=>x<=0)||ids.Distinct().Count()!=ids.Length)return BadRequest(new{message="物流選項不正確。"});
                if(option.TaxTypeId.HasValue){await using var tax=new NpgsqlCommand("select exists(select 1 from cmepms.tax_type where id=@id and is_active)",Connection,tx);tax.Parameters.AddWithValue("id",option.TaxTypeId.Value);if(!(bool)(await tax.ExecuteScalarAsync(ct))!)return BadRequest(new{message="稅別不存在或已停用。"});}
                if(ids.Length>0){await using var shipping=new NpgsqlCommand("select count(*) from cmepms.shipping_method where id=any(@ids) and is_active and temperature_zone=@zone",Connection,tx);shipping.Parameters.AddWithValue("ids",ids);shipping.Parameters.AddWithValue("zone",option.TemperatureZone!);if((long)(await shipping.ExecuteScalarAsync(ct))! != ids.Length)return BadRequest(new{message="物流與配送溫層不符。"});}
                var name=$"{label} / {option.Units}{inventoryUnit}";if(name.Length>100)return BadRequest(new{message="規格名稱過長。"});long sku;
                if(option.Id.HasValue){sku=option.Id.Value;if(!existingSku.TryGetValue(sku,out var old)||old.Inventory!=inventory||!keptSkus.Add(sku))return Conflict(new{message="規格選項已變更，請重新載入。"});if(old.Units!=option.Units&&activeSku.Contains(sku))return Conflict(new{message="此選項有未取消的訂單，請先取消訂單。"});}
                else sku=0;
                var sql=sku==0?"insert into cmepms.product_sku(product_id,inventory_id,units_per_sale,sku_no,sku_name,price,original_price,stock_qty,is_active,tax_type_id,temperature_zone) values(@product,@inventory,@units,@no,@name,@price,@original,0,@active,@tax,@zone) returning id":"update cmepms.product_sku set units_per_sale=@units,sku_name=@name,price=@price,original_price=@original,is_active=@active,tax_type_id=@tax,temperature_zone=@zone,upd_date=now() where id=@id returning id";
                await using(var save=new NpgsqlCommand(sql,Connection,tx)){save.Parameters.AddWithValue("product",productId);save.Parameters.AddWithValue("inventory",inventory);save.Parameters.AddWithValue("units",option.Units);save.Parameters.AddWithValue("no","S"+Guid.NewGuid().ToString("N").ToUpperInvariant());save.Parameters.AddWithValue("name",name);save.Parameters.AddWithValue("price",option.Price);save.Parameters.AddWithValue("active",option.IsActive);save.Parameters.Add("original",NpgsqlDbType.Numeric).Value=(object?)option.SuggestedPrice??DBNull.Value;save.Parameters.Add("tax",NpgsqlDbType.Bigint).Value=(object?)option.TaxTypeId??DBNull.Value;save.Parameters.AddWithValue("zone",option.TemperatureZone!);save.Parameters.AddWithValue("id",sku);sku=(long)(await save.ExecuteScalarAsync(ct))!;}keptSkus.Add(sku);
                await using(var clear=new NpgsqlCommand("delete from cmepms.sku_shipping_method where sku_id=@id",Connection,tx)){clear.Parameters.AddWithValue("id",sku);await clear.ExecuteNonQueryAsync(ct);}foreach(var shippingId in ids){await using var link=new NpgsqlCommand("insert into cmepms.sku_shipping_method(sku_id,shipping_method_id) values(@id,@shipping)",Connection,tx);link.Parameters.AddWithValue("id",sku);link.Parameters.AddWithValue("shipping",shippingId);await link.ExecuteNonQueryAsync(ct);}
            }
        }
        foreach(var (sku,_) in existingSku.Where(x=>!keptSkus.Contains(x.Key))){if(activeSku.Contains(sku))return Conflict(new{message="此規格有未取消的訂單，請先取消訂單。"});await using var deactivate=new NpgsqlCommand("update cmepms.product_sku set is_active=false,is_deleted=true,upd_date=now() where id=@id",Connection,tx);deactivate.Parameters.AddWithValue("id",sku);await deactivate.ExecuteNonQueryAsync(ct);}
        foreach(var (inventory,_) in saved.Where(x=>!keptStocks.Contains(x.Key))){await using var clear=new NpgsqlCommand("update cmepms.product_inventory set stock_qty=0,upd_date=now() where id=@id",Connection,tx);clear.Parameters.AddWithValue("id",inventory);await clear.ExecuteNonQueryAsync(ct);}
        if(input.Status=="ACTIVE"){
            await using var check=new NpgsqlCommand("select exists(select 1 from cmepms.product_sku s where s.product_id=@id and s.is_active) and not exists(select 1 from cmepms.product_sku s left join cmepms.tax_type t on t.id=s.tax_type_id where s.product_id=@id and s.is_active and (t.id is null or not t.is_active or not exists(select 1 from cmepms.shipping_method m where m.is_active and m.temperature_zone=s.temperature_zone and (not exists(select 1 from cmepms.sku_shipping_method x where x.sku_id=s.id) or exists(select 1 from cmepms.sku_shipping_method x where x.sku_id=s.id and x.shipping_method_id=m.id)))))",Connection,tx);check.Parameters.AddWithValue("id",productId);if(!(bool)(await check.ExecuteScalarAsync(ct))!)return Conflict(new{message="每個啟用規格都必須有有效稅別與可用物流才能上架。"});
        }
        if(activeSku.Count>0){await using var unitCheck=new NpgsqlCommand("select inventory_unit from cmepms.product where id=@id",Connection,tx);unitCheck.Parameters.AddWithValue("id",productId);if((string)(await unitCheck.ExecuteScalarAsync(ct))! != inventoryUnit)return Conflict(new{message="商品有未取消的訂單，不能變更庫存單位。"});}
        await using(var updateProduct=new NpgsqlCommand("update cmepms.product set product_name=@name,description=@description,video_url=@video,status=@status,inventory_unit=@unit,upd_date=now() where id=@id",Connection,tx)){updateProduct.Parameters.AddWithValue("name",productName);updateProduct.Parameters.AddWithValue("description",description);updateProduct.Parameters.Add("video",NpgsqlDbType.Varchar).Value=(object?)video??DBNull.Value;updateProduct.Parameters.AddWithValue("status",input.Status!);updateProduct.Parameters.AddWithValue("unit",inventoryUnit);updateProduct.Parameters.AddWithValue("id",productId);await updateProduct.ExecuteNonQueryAsync(ct);}
        await tx.CommitAsync(ct);return NoContent();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateInput input, CancellationToken ct)
    {
        var name = input.ProductName?.Trim(); var description = input.Description?.Trim(); var video = input.VideoUrl?.Trim();
        if (input.CategoryId <= 0 || string.IsNullOrWhiteSpace(name) || name.Length > 150 || string.IsNullOrWhiteSpace(description) || description.Length > 10000 || input.Total < 0 || input.Stocks is null || input.Stocks.Count is < 1 or > 100 || (!string.IsNullOrWhiteSpace(video) && (video.Length > 2048 || !Uri.TryCreate(video, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)))
            return BadRequest(new { message = "請檢查商品資料、總庫存與規格。" });
        if (input.Stocks.Sum(x => (long)x.Stock) != input.Total || input.Stocks.Any(x => x.Stock < 0 || x.Options is null || x.Options.Count is < 1 or > 100))
            return BadRequest(new { message = "請設定每個規格的庫存；各規格庫存加總必須等於商品總數。" });

        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        string category;
        await using (var cat = new NpgsqlCommand("select pro_no from cmepms.product_category where id=@id and is_active for share", Connection, tx)) {
            cat.Parameters.AddWithValue("id", input.CategoryId); category = (await cat.ExecuteScalarAsync(ct) as string) ?? "";
        }
        if (!Keys.TryGetValue(category, out var allowed)) return BadRequest(new { message = "商品主分類不存在或不支援。" });
        var unitKinds=input.Stocks.SelectMany(x=>x.Options!).Select(x=>x.UnitKind).Distinct().ToArray();
        if(unitKinds.Length!=1 || unitKinds[0] is not ("隻" or "件" or "包" or "瓶") || (category=="FISI" && unitKinds[0]!="隻") || (category!="FISI" && unitKinds[0]=="隻") || (category=="AQUI" && unitKinds[0]=="瓶"))return BadRequest(new{message="同一商品的庫存單位必須一致；包與瓶不可混用。"});
        var inventoryUnit=unitKinds[0]!;
        bool pack = false, bottle = false;
        var normalized = new List<(string Json, string Name, StockInput Stock)>();
        foreach (var stock in input.Stocks) {
            var attrs = stock.Attributes ?? []; var values = new SortedDictionary<string, object>(StringComparer.Ordinal);
            foreach (var (key, value) in attrs) {
                if (!IsSet(value)) continue;
                if (!allowed.Contains(key)) return BadRequest(new { message = "規格不屬於選擇的商品分類。" });
                if (key is "color" or "size" or "pellet") {
                    if (value.ValueKind != JsonValueKind.String) return BadRequest(new { message = "規格選項不正確。" });
                    var selected = value.GetString()!;
                    if (!(key == "color" ? Colors : key == "pellet" ? Pellets : Sizes).Contains(selected)) return BadRequest(new { message = "規格選項不正確。" });
                    values.Add(key, selected);
                } else {
                    if (value.ValueKind != JsonValueKind.Number || !value.TryGetDecimal(out var number) || number <= 0 || number > 100000000 || (key == "lengthCm" && (number < 0.1m || number > 500m || decimal.Round(number, 1) != number)))
                        return BadRequest(new { message = "請檢查規格數值；魚隻長度須介於 0.1 至 500 cm。" });
                    values.Add(key, number);
                }
                if (key is "pack" or "largePelletPack" or "smallPelletPack") pack = true;
                if (key == "bottle") bottle = true;
            }
            if (pack && bottle) return BadRequest(new { message = "同一商品不可同時設定包與瓶。" });
            if (stock.Options!.Any(o => o.Units < 1 || o.Price < 0 || o.Price > 9999999999.99m || decimal.Round(o.Price, 2) != o.Price || o.SuggestedPrice is < 0 or > 9999999999.99m || (o.SuggestedPrice.HasValue && decimal.Round(o.SuggestedPrice.Value, 2) != o.SuggestedPrice.Value) || o.TemperatureZone is not ("AMBIENT" or "CHILLED" or "FROZEN") || (o.ShippingMethodIds ?? []).Any(x => x <= 0) || (o.ShippingMethodIds ?? []).Distinct().Count() != (o.ShippingMethodIds?.Length ?? 0)) || stock.Options!.Select(x => x.Units).Distinct().Count() != stock.Options!.Count)
                return BadRequest(new { message = "請檢查購買數量、售價及物流設定。" });
            string Label(KeyValuePair<string, object> x) => x.Key switch {
                "lengthCm" => $"{x.Value}cm", "color" or "size" or "pellet" => $"{x.Value}",
                "largePelletPack" => $"{x.Value}包（大顆粒）", "smallPelletPack" => $"{x.Value}包（小顆粒）",
                "pack" => $"{x.Value}包", "bottle" => $"{x.Value}瓶", "singleHole" => $"{x.Value}型（單孔）", "doubleHole" => $"{x.Value}型（雙孔）",
                "watt" => $"{x.Value}W", "litre" => $"{x.Value}L", "foot" => $"{x.Value}尺",
                "gLargePellet" => $"{x.Value}g（大顆粒）", "gSmallPellet" => $"{x.Value}g（小顆粒）",
                "mlLargePellet" => $"{x.Value}ml（大顆粒）", "mlSmallPellet" => $"{x.Value}ml（小顆粒）",
                "kgLargePellet" => $"{x.Value}kg（大顆粒）", "kgSmallPellet" => $"{x.Value}kg（小顆粒）",
                _ => $"{x.Value}{x.Key}"
            };
            normalized.Add((JsonSerializer.Serialize(values), values.Count == 0 ? "標準規格" : string.Join(" / ", values.Select(Label)), stock));
        }
        if (normalized.Select(x => x.Json).Distinct(StringComparer.Ordinal).Count() != normalized.Count) return BadRequest(new { message = "相同規格應共用同一筆庫存，請合併購買選項。" });
        foreach (var row in normalized) foreach (var option in row.Stock.Options!) {
            if (option.TaxTypeId.HasValue) { await using var tax = new NpgsqlCommand("select exists(select 1 from cmepms.tax_type where id=@id and is_active)", Connection, tx); tax.Parameters.AddWithValue("id", option.TaxTypeId.Value); if (!(bool)(await tax.ExecuteScalarAsync(ct))!) return BadRequest(new { message = "稅別不存在或已停用。" }); }
            var ids = option.ShippingMethodIds ?? []; if (ids.Length > 0) { await using var shipping = new NpgsqlCommand("select count(*) from cmepms.shipping_method where id=any(@ids) and is_active and temperature_zone=@zone", Connection, tx); shipping.Parameters.AddWithValue("ids", ids); shipping.Parameters.AddWithValue("zone", option.TemperatureZone!); if ((long)(await shipping.ExecuteScalarAsync(ct))! != ids.Length) return BadRequest(new { message = "物流與配送溫層不相符。" }); }
        }
        try {
            long productId = 0;
            for (var attempt = 0; attempt < 10 && productId == 0; attempt++) {
                var productNo = $"{TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTimeOffset.UtcNow, "Asia/Taipei").Year}{RandomNumberGenerator.GetInt32(100_000_000):D8}";
                await using var insert = new NpgsqlCommand("insert into cmepms.product(product_no,category_id,product_name,description,status,video_url,variation_name,variation_mode,uses_shared_inventory,inventory_unit) values(@no,@category,@name,@description,'DRAFT',@video,'商品規格','MULTI',true,@unit) on conflict(product_no) do nothing returning id", Connection, tx);
                insert.Parameters.AddWithValue("no", productNo); insert.Parameters.AddWithValue("category", input.CategoryId); insert.Parameters.AddWithValue("name", name); insert.Parameters.AddWithValue("description", description); insert.Parameters.AddWithValue("unit", inventoryUnit); insert.Parameters.Add("video", NpgsqlDbType.Varchar).Value = (object?)video ?? DBNull.Value;
                productId = (long?)(await insert.ExecuteScalarAsync(ct)) ?? 0;
            }
            if (productId == 0) return Conflict(new { message = "無法產生不重複的商品編號，請重試。" });
            foreach (var row in normalized) {
                await using var inventory = new NpgsqlCommand("insert into cmepms.product_inventory(product_id,attributes,stock_qty) values(@product,@attrs,@stock) returning id", Connection, tx);
                inventory.Parameters.AddWithValue("product", productId); inventory.Parameters.Add("attrs", NpgsqlDbType.Jsonb).Value = row.Json; inventory.Parameters.AddWithValue("stock", row.Stock.Stock);
                var inventoryId = (long)(await inventory.ExecuteScalarAsync(ct))!;
                foreach (var option in row.Stock.Options!) {
                    var skuName = $"{row.Name} / {option.Units}{inventoryUnit}";
                    if (skuName.Length > 100) return BadRequest(new { message = "規格名稱過長。" });
                    await using var sku = new NpgsqlCommand("insert into cmepms.product_sku(product_id,inventory_id,units_per_sale,sku_no,sku_name,price,original_price,stock_qty,is_active,tax_type_id,temperature_zone) values(@product,@inventory,@units,@no,@name,@price,@original,0,@active,@tax,@zone) returning id", Connection, tx);
                    sku.Parameters.AddWithValue("product", productId); sku.Parameters.AddWithValue("inventory", inventoryId); sku.Parameters.AddWithValue("units", option.Units); sku.Parameters.AddWithValue("no", "S" + Guid.NewGuid().ToString("N").ToUpperInvariant()); sku.Parameters.AddWithValue("name", skuName); sku.Parameters.AddWithValue("price", option.Price); sku.Parameters.AddWithValue("active",option.IsActive); sku.Parameters.Add("original", NpgsqlDbType.Numeric).Value = (object?)option.SuggestedPrice ?? DBNull.Value; sku.Parameters.Add("tax", NpgsqlDbType.Bigint).Value = (object?)option.TaxTypeId ?? DBNull.Value; sku.Parameters.AddWithValue("zone", option.TemperatureZone!);
                    var skuId = (long)(await sku.ExecuteScalarAsync(ct))!;
                    foreach (var shippingId in option.ShippingMethodIds ?? []) { await using var link = new NpgsqlCommand("insert into cmepms.sku_shipping_method(sku_id,shipping_method_id) values(@sku,@shipping)", Connection, tx); link.Parameters.AddWithValue("sku", skuId); link.Parameters.AddWithValue("shipping", shippingId); await link.ExecuteNonQueryAsync(ct); }
                }
            }
            await tx.CommitAsync(ct); return Ok(new { id = productId });
        } catch (PostgresException e) when (e.SqlState is PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.ForeignKeyViolation) { return Conflict(new { message = "商品或規格資料發生衝突，請重新整理後重試。" }); }
    }
}
