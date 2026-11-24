using LinfishAppcation.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LinfishAppcation.Services;

public sealed class StorageCleanupService(AppDbContext db,ProductImageService images)
{
 public static async Task Queue(NpgsqlConnection connection,NpgsqlTransaction tx,string? key,CancellationToken ct)
 {
  if(string.IsNullOrWhiteSpace(key))return;
  if(key.StartsWith("db-images/",StringComparison.Ordinal)){
   await using var remove=new NpgsqlCommand("delete from cmepms.product_image_data d where d.object_key=@key and not exists(select 1 from cmepms.product_image i where i.object_key=d.object_key) and not exists(select 1 from cmepms.product_sku s where s.image_key=d.object_key)",connection,tx);
   remove.Parameters.AddWithValue("key",key);await remove.ExecuteNonQueryAsync(ct);return;
  }
  if(!key.StartsWith("linfish-products/",StringComparison.Ordinal))return;
  await using var cmd=new NpgsqlCommand("insert into cmepms.storage_cleanup(object_key,next_attempt) values(@key,now()) on conflict(object_key) do update set next_attempt=least(cmepms.storage_cleanup.next_attempt,now())",connection,tx);cmd.Parameters.AddWithValue("key",key);await cmd.ExecuteNonQueryAsync(ct);
 }
 public async Task RegisterPending(string key,CancellationToken ct)
 {
  await using var connection=new NpgsqlConnection(db.Database.GetConnectionString());await connection.OpenAsync(ct);
  await using var cmd=new NpgsqlCommand("insert into cmepms.storage_cleanup(object_key,next_attempt) values(@key,now()+interval '1 hour')",connection);cmd.Parameters.AddWithValue("key",key);await cmd.ExecuteNonQueryAsync(ct);
 }
 public async Task ProcessOne(CancellationToken ct)
 {
  var connection=(NpgsqlConnection)db.Database.GetDbConnection();await connection.OpenAsync(ct);await using var tx=await connection.BeginTransactionAsync(ct);
  await using var next=new NpgsqlCommand("select object_key from cmepms.storage_cleanup where next_attempt<=now() order by next_attempt for update skip locked limit 1",connection,tx);var key=await next.ExecuteScalarAsync(ct) as string;if(key is null)return;
  await using var check=new NpgsqlCommand("select exists(select 1 from cmepms.product_image where object_key=@key union all select 1 from cmepms.product_sku where image_key=@key)",connection,tx);check.Parameters.AddWithValue("key",key);var referenced=(bool)(await check.ExecuteScalarAsync(ct))!;
  if(!referenced){try{await images.Delete(key,ct);}catch(Exception e) when(e is not OperationCanceledException){await using var retry=new NpgsqlCommand("update cmepms.storage_cleanup set attempts=attempts+1,next_attempt=now()+interval '5 minutes',last_error='儲存服務暫時無法刪除，將重試' where object_key=@key",connection,tx);retry.Parameters.AddWithValue("key",key);await retry.ExecuteNonQueryAsync(ct);await tx.CommitAsync(ct);return;}}
  await using var done=new NpgsqlCommand("delete from cmepms.storage_cleanup where object_key=@key",connection,tx);done.Parameters.AddWithValue("key",key);await done.ExecuteNonQueryAsync(ct);await tx.CommitAsync(ct);
 }
}

public sealed class StorageCleanupWorker(IServiceScopeFactory scopes,ILogger<StorageCleanupWorker> logger):BackgroundService
{
 protected override async Task ExecuteAsync(CancellationToken stoppingToken)
 {
  while(!stoppingToken.IsCancellationRequested){try{await using var scope=scopes.CreateAsyncScope();await scope.ServiceProvider.GetRequiredService<StorageCleanupService>().ProcessOne(stoppingToken);}catch(OperationCanceledException) when(stoppingToken.IsCancellationRequested){break;}catch(Exception){logger.LogWarning("商品圖片清理工作暫時無法執行，稍後會重試。");}try{await Task.Delay(TimeSpan.FromSeconds(30),stoppingToken);}catch(OperationCanceledException){break;}}
 }
}
