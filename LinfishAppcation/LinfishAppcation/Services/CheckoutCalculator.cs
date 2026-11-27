using Npgsql;
using System.Data.Common;

namespace LinfishAppcation.Services;

public sealed record CheckoutItem(long SkuId,int Quantity,decimal? ExpectedUnitPrice);
public sealed record CheckoutLine(long SkuId,long InventoryId,int UnitsPerSale,string ProductName,string SkuName,string SkuNo,int Quantity,decimal UnitPrice,long TaxId,string TaxName,decimal TaxRate,bool IncludesTax,bool AllowMixed,decimal TaxAmount,decimal AdditionalTax,string Zone,long[] ShippingIds);
public sealed record DeliveryOption(long Id,string Name,string Zone,decimal Fee,decimal? FreeThreshold);
public sealed record CheckoutQuote(List<CheckoutLine> Lines,List<DeliveryOption> Options,long SelectedShippingId,string ShippingName,decimal Subtotal,decimal TaxAmount,decimal AdditionalTax,decimal ShippingFee,decimal Total);
public sealed class CheckoutException(string message):Exception(message);

public static class CheckoutCalculator
{
 public static async Task<CheckoutQuote> Calculate(NpgsqlConnection connection,NpgsqlTransaction? tx,IReadOnlyList<CheckoutItem>? items,long? shippingId,bool lockRows,CancellationToken ct)
 {
  if(items is null || items.Count is <1 or >100 || items.Any(x=>x.SkuId<=0 || x.Quantity is <1 or >10000) || items.Select(x=>x.SkuId).Distinct().Count()!=items.Count)throw new CheckoutException("請檢查商品與購買數量。");
  if(lockRows){
   var productIds=new List<long>();await using(var map=new NpgsqlCommand("select distinct product_id from cmepms.product_sku where id=any(@ids) order by product_id",connection,tx)){map.Parameters.AddWithValue("ids",items.Select(x=>x.SkuId).ToArray());await using var reader=await map.ExecuteReaderAsync(ct);while(await reader.ReadAsync(ct))productIds.Add(reader.GetInt64(0));}
   foreach(var productId in productIds){await using var product=new NpgsqlCommand("select id from cmepms.product where id=@id for share",connection,tx);product.Parameters.AddWithValue("id",productId);await product.ExecuteScalarAsync(ct);}
   var inventoryIds=new List<long>();await using(var map=new NpgsqlCommand("select distinct inventory_id from cmepms.product_sku where id=any(@ids) order by inventory_id",connection,tx)){map.Parameters.AddWithValue("ids",items.Select(x=>x.SkuId).ToArray());await using var reader=await map.ExecuteReaderAsync(ct);while(await reader.ReadAsync(ct))inventoryIds.Add(reader.GetInt64(0));}
   foreach(var inventoryId in inventoryIds){await using var stock=new NpgsqlCommand("select id from cmepms.product_inventory where id=@id for update",connection,tx);stock.Parameters.AddWithValue("id",inventoryId);await stock.ExecuteScalarAsync(ct);}
   foreach(var item in items.OrderBy(x=>x.SkuId)){await using var sku=new NpgsqlCommand("select id from cmepms.product_sku where id=@id for update",connection,tx);sku.Parameters.AddWithValue("id",item.SkuId);await sku.ExecuteScalarAsync(ct);}
  }
  var lines=new List<CheckoutLine>();
  foreach(var item in items.OrderBy(x=>x.SkuId)){
   // 2026-11-27：結帳數量與商城皆由實際庫存及每組數量計算。
   var sql="""
     select p.product_name,s.sku_name,s.sku_no,s.price,coalesce(inv.stock_qty / nullif(s.units_per_sale,0),0)::integer,t.id,t.name,t.rate_percent,t.price_includes_tax,t.allow_mixed,coalesce(s.temperature_zone,'AMBIENT'),
       array(select m.shipping_method_id from cmepms.sku_shipping_method m where m.sku_id=s.id order by m.shipping_method_id),s.inventory_id,s.units_per_sale
     from cmepms.product_sku s join cmepms.product_inventory inv on inv.id=s.inventory_id join cmepms.product p on p.id=s.product_id join cmepms.product_category c on c.id=p.category_id
       join cmepms.tax_type t on t.id=s.tax_type_id
     where s.id=@id and s.is_active and p.status='ACTIVE' and c.is_active and t.is_active
     """+(lockRows?" for share of p,c,t":"");
   await using var cmd=new NpgsqlCommand(sql,connection,tx);cmd.Parameters.AddWithValue("id",item.SkuId);
   await using var r=await cmd.ExecuteReaderAsync(ct);
   if(!await r.ReadAsync(ct))throw new CheckoutException("商品已下架或尚未設定可用稅別，請聯絡管理員。");
   if(r.GetInt32(4)<item.Quantity)throw new CheckoutException("商品庫存不足，請重新確認購物車。");
   var price=r.GetDecimal(3);if(item.ExpectedUnitPrice.HasValue && item.ExpectedUnitPrice.Value!=price)throw new CheckoutException("商品售價已變更，請重新確認訂單。");
   var baseAmount=price*item.Quantity;var rate=r.GetDecimal(7);var includes=r.GetBoolean(8);
   var tax=decimal.Round(includes ? baseAmount*rate/(100m+rate) : baseAmount*rate/100m,0,MidpointRounding.AwayFromZero);
   lines.Add(new(item.SkuId,r.GetInt64(12),r.GetInt32(13),r.GetString(0),r.GetString(1),r.GetString(2),item.Quantity,price,r.GetInt64(5),r.GetString(6),rate,includes,r.GetBoolean(9),tax,includes?0:tax,r.GetString(10),r.GetFieldValue<long[]>(11)));
  }
  if(lines.Select(x=>x.TaxId).Distinct().Count()>1 && lines.Any(x=>!x.AllowMixed))throw new CheckoutException("購物車含不能混合結帳的稅別，請分開下單。");
  var options=new List<DeliveryOption>();
  await using(var cmd=new NpgsqlCommand("select id,name,temperature_zone,base_fee,free_threshold from cmepms.shipping_method where is_active order by id"+(lockRows?" for share":""),connection,tx))
  await using(var r=await cmd.ExecuteReaderAsync(ct)){while(await r.ReadAsync(ct)){var id=r.GetInt64(0);var zone=r.GetString(2);if(lines.All(x=>x.Zone==zone && (x.ShippingIds.Length==0 || x.ShippingIds.Contains(id))))options.Add(new(id,r.GetString(1),zone,r.GetDecimal(3),r.IsDBNull(4)?null:r.GetDecimal(4)));}}
  if(options.Count==0)throw new CheckoutException("商品沒有共同可用的物流，請分開下單或聯絡管理員。");
  var selected=shippingId.HasValue?options.FirstOrDefault(x=>x.Id==shippingId.Value):options[0];
  if(selected is null)throw new CheckoutException("選擇的物流已不可用，請重新選擇。");
  var subtotal=lines.Sum(x=>x.UnitPrice*x.Quantity);var taxTotal=lines.Sum(x=>x.TaxAmount);var additional=lines.Sum(x=>x.AdditionalTax);
  var fee=selected.FreeThreshold.HasValue && subtotal>=selected.FreeThreshold.Value?0:selected.Fee;var total=subtotal+additional+fee;
  if(total>9999999999.99m || subtotal>9999999999.99m || taxTotal>9999999999.99m)throw new CheckoutException("訂單金額超出範圍。");
  return new(lines,options,selected.Id,selected.Name,subtotal,taxTotal,additional,fee,total);
 }
}
