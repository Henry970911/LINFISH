using LinfishAppcation.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LinfishAppcation.Controllers;

[ApiController,Route("api/admin/settings"),Authorize(Roles="admin")]
public sealed class CommerceSettingsController(AppDbContext db):ControllerBase
{
 private NpgsqlConnection Connection=>(NpgsqlConnection)db.Database.GetDbConnection();
 public sealed record TaxInput(string? Name,decimal RatePercent,bool PriceIncludesTax,bool AllowMixed,bool IsActive);
 public sealed record ShippingInput(string? Name,string? TemperatureZone,decimal BaseFee,decimal? FreeThreshold,bool IsActive);

 [HttpGet("taxes")]
 public async Task<IActionResult> Taxes(CancellationToken ct){await Connection.OpenAsync(ct);await using var cmd=new NpgsqlCommand("select id,name,rate_percent,price_includes_tax,allow_mixed,is_active from cmepms.tax_type order by id",Connection);await using var r=await cmd.ExecuteReaderAsync(ct);var rows=new List<object>();while(await r.ReadAsync(ct))rows.Add(new{id=r.GetInt64(0),name=r.GetString(1),ratePercent=r.GetDecimal(2),priceIncludesTax=r.GetBoolean(3),allowMixed=r.GetBoolean(4),isActive=r.GetBoolean(5)});return Ok(rows);}
 [HttpPost("taxes"),HttpPut("taxes/{id:long}")]
 public async Task<IActionResult> SaveTax(long? id,TaxInput input,CancellationToken ct){var name=input.Name?.Trim();if(string.IsNullOrWhiteSpace(name)||name.Length>100||input.RatePercent<0||input.RatePercent>100||decimal.Round(input.RatePercent,4)!=input.RatePercent)return BadRequest(new{message="請檢查稅別名稱與稅率。"});await Connection.OpenAsync(ct);var sql=id is null?"insert into cmepms.tax_type(name,rate_percent,price_includes_tax,allow_mixed,is_active) values(@name,@rate,@included,@mixed,@active) returning id":"update cmepms.tax_type set name=@name,rate_percent=@rate,price_includes_tax=@included,allow_mixed=@mixed,is_active=@active,upd_date=now() where id=@id returning id";await using var cmd=new NpgsqlCommand(sql,Connection);cmd.Parameters.AddWithValue("name",name);cmd.Parameters.AddWithValue("rate",input.RatePercent);cmd.Parameters.AddWithValue("included",input.PriceIncludesTax);cmd.Parameters.AddWithValue("mixed",input.AllowMixed);cmd.Parameters.AddWithValue("active",input.IsActive);if(id.HasValue)cmd.Parameters.AddWithValue("id",id.Value);try{var result=await cmd.ExecuteScalarAsync(ct);return result is null?NotFound():Ok(new{id=(long)result});}catch(PostgresException e)when(e.SqlState==PostgresErrorCodes.UniqueViolation){return Conflict(new{message="稅別名稱已存在。"});}}

 [HttpGet("shipping")]
 public async Task<IActionResult> Shipping(CancellationToken ct){await Connection.OpenAsync(ct);await using var cmd=new NpgsqlCommand("select id,name,temperature_zone,base_fee,free_threshold,is_active from cmepms.shipping_method order by id",Connection);await using var r=await cmd.ExecuteReaderAsync(ct);var rows=new List<object>();while(await r.ReadAsync(ct))rows.Add(new{id=r.GetInt64(0),name=r.GetString(1),temperatureZone=r.GetString(2),baseFee=r.GetDecimal(3),freeThreshold=r.IsDBNull(4)?(decimal?)null:r.GetDecimal(4),isActive=r.GetBoolean(5)});return Ok(rows);}
 [HttpPost("shipping"),HttpPut("shipping/{id:long}")]
 public async Task<IActionResult> SaveShipping(long? id,ShippingInput input,CancellationToken ct){var name=input.Name?.Trim();if(string.IsNullOrWhiteSpace(name)||name.Length>100||input.TemperatureZone is not ("AMBIENT" or "CHILLED" or "FROZEN")||input.BaseFee<0||input.BaseFee>9999999999.99m||decimal.Round(input.BaseFee,2)!=input.BaseFee||input.FreeThreshold is < 0 or > 9999999999.99m||(input.FreeThreshold.HasValue&&decimal.Round(input.FreeThreshold.Value,2)!=input.FreeThreshold.Value))return BadRequest(new{message="請檢查物流名稱、溫層與運費。"});await Connection.OpenAsync(ct);var sql=id is null?"insert into cmepms.shipping_method(name,temperature_zone,base_fee,free_threshold,is_active) values(@name,@zone,@fee,@threshold,@active) returning id":"update cmepms.shipping_method set name=@name,temperature_zone=@zone,base_fee=@fee,free_threshold=@threshold,is_active=@active,upd_date=now() where id=@id returning id";await using var cmd=new NpgsqlCommand(sql,Connection);cmd.Parameters.AddWithValue("name",name);cmd.Parameters.AddWithValue("zone",input.TemperatureZone!);cmd.Parameters.AddWithValue("fee",input.BaseFee);cmd.Parameters.Add("threshold",NpgsqlTypes.NpgsqlDbType.Numeric).Value=(object?)input.FreeThreshold ?? DBNull.Value;cmd.Parameters.AddWithValue("active",input.IsActive);if(id.HasValue)cmd.Parameters.AddWithValue("id",id.Value);try{var result=await cmd.ExecuteScalarAsync(ct);return result is null?NotFound():Ok(new{id=(long)result});}catch(PostgresException e)when(e.SqlState==PostgresErrorCodes.UniqueViolation){return Conflict(new{message="物流名稱已存在。"});}}
}
