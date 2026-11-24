using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using SkiaSharp;

namespace LinfishAppcation.Services;

public sealed class ProductImageService(IConfiguration config,IHttpClientFactory clients,IHttpContextAccessor http)
{
 public const int MaxFileBytes=5*1024*1024;
 private const string KeyPrefix="linfish-products/";
 private (Uri Url,string Bucket,string Secret) Settings()
 {
  var baseUrl=config["Supabase:Url"];var bucket=config["Supabase:StorageBucket"];var secret=config["Supabase:StorageSecretKey"];
  if(!Uri.TryCreate(baseUrl,UriKind.Absolute,out var uri)||uri.Scheme!=Uri.UriSchemeHttps||string.IsNullOrWhiteSpace(bucket)||!Regex.IsMatch(bucket,"^[a-z0-9][a-z0-9._-]{1,62}$")||string.IsNullOrWhiteSpace(secret))throw new InvalidOperationException("圖片儲存尚未設定完成，請確認 Supabase 網址、bucket 與後端金鑰。");
  return(uri,bucket,secret);
 }
 public string? ResolveUrl(string? key)
 {
  if(string.IsNullOrWhiteSpace(key))return null;
  if(key.StartsWith("db-images/",StringComparison.Ordinal)) {
   if(config.GetValue<bool>("Images:UseRelativeUrls"))return $"/api/product-images/{key[10..]}";
   var req=http.HttpContext?.Request;
   return req is null ? null : $"{req.Scheme}://{req.Host}{req.PathBase}/api/product-images/{key[10..]}";
  }
  if(!key.StartsWith(KeyPrefix,StringComparison.Ordinal))return key;
  var baseUrl=config["Supabase:Url"];var bucket=config["Supabase:StorageBucket"];
  if(!Uri.TryCreate(baseUrl,UriKind.Absolute,out var url)||url.Scheme!=Uri.UriSchemeHttps||string.IsNullOrWhiteSpace(bucket)||!Regex.IsMatch(bucket,"^[a-z0-9][a-z0-9._-]{1,62}$"))return null;
  return $"{url.ToString().TrimEnd('/')}/storage/v1/object/public/{Uri.EscapeDataString(bucket)}/{string.Join('/',key.Split('/').Select(Uri.EscapeDataString))}";
 }
 public bool IsOwnedKey(string key)=>key.StartsWith(KeyPrefix,StringComparison.Ordinal)||key.StartsWith("db-images/",StringComparison.Ordinal);
 public async Task<(byte[] Bytes,string ContentType)> Normalize(IFormFile file,CancellationToken ct)
 {
  if(file.Length<=0||file.Length>MaxFileBytes)throw new ArgumentException("圖片大小須大於 0 且不超過 5 MB。");
  await using var input=file.OpenReadStream();using var data=new MemoryStream();await input.CopyToAsync(data,ct);
  if(data.Length>MaxFileBytes)throw new ArgumentException("圖片大小不可超過 5 MB。");data.Position=0;
  using var codec=SKCodec.Create(data) ?? throw new ArgumentException("無法讀取圖片，請使用 JPG 或 PNG。");
  if(codec.EncodedFormat is not (SKEncodedImageFormat.Jpeg or SKEncodedImageFormat.Png)||codec.FrameCount>1)throw new ArgumentException("只接受靜態 JPG 或 PNG 圖片。");
  var info=codec.Info;if(info.Width<=0||info.Height<=0||info.Width>6000||info.Height>6000||(long)info.Width*info.Height>20000000)throw new ArgumentException("圖片尺寸過大，請縮小後重試。");
  using var source=SKBitmap.Decode(codec) ?? throw new ArgumentException("圖片檔案損毀或無法解碼。");
  var origin=(int)codec.EncodedOrigin;var swap=origin is >=5 and <=8;var width=swap?info.Height:info.Width;var height=swap?info.Width:info.Height;
  using var result=new SKBitmap(width,height);using(var canvas=new SKCanvas(result)){
   var m=origin switch{
    2=>new SKMatrix{ScaleX=-1,ScaleY=1,TransX=info.Width,Persp2=1},
    3=>new SKMatrix{ScaleX=-1,ScaleY=-1,TransX=info.Width,TransY=info.Height,Persp2=1},
    4=>new SKMatrix{ScaleX=1,ScaleY=-1,TransY=info.Height,Persp2=1},
    5=>new SKMatrix{SkewX=1,SkewY=1,Persp2=1},
    6=>new SKMatrix{SkewX=-1,SkewY=1,TransX=info.Height,Persp2=1},
    7=>new SKMatrix{SkewX=-1,SkewY=-1,TransX=info.Height,TransY=info.Width,Persp2=1},
    8=>new SKMatrix{SkewX=1,SkewY=-1,TransY=info.Width,Persp2=1},
    _=>SKMatrix.Identity};canvas.SetMatrix(m);canvas.DrawBitmap(source,0,0);}
  var scale=Math.Min(1.0,2048.0/Math.Max(width,height));
  using var resized=scale<1 ? result.Resize(new SKImageInfo(Math.Max(1,(int)Math.Round(width*scale)),Math.Max(1,(int)Math.Round(height*scale))),new SKSamplingOptions(SKFilterMode.Linear,SKMipmapMode.Linear)) : null;
  if(scale<1 && resized is null)throw new ArgumentException("圖片縮放失敗。");
  using var image=SKImage.FromBitmap(resized ?? result);using var encoded=image.Encode(SKEncodedImageFormat.Webp,85) ?? throw new ArgumentException("圖片處理失敗。");
  return(encoded.ToArray(),"image/webp");
 }
 public string NewKey(long productId)=>$"db-images/{Guid.NewGuid():N}.webp";
 public async Task Upload(string key,byte[] bytes,string contentType,CancellationToken ct)
 {
  var (baseUrl,bucket,secret)=Settings();
  using var req=new HttpRequestMessage(HttpMethod.Post,$"{baseUrl.ToString().TrimEnd('/')}/storage/v1/object/{Uri.EscapeDataString(bucket)}/{string.Join('/',key.Split('/').Select(Uri.EscapeDataString))}");
  req.Headers.Add("apikey",secret);if(secret.StartsWith("eyJ",StringComparison.Ordinal))req.Headers.Authorization=new AuthenticationHeaderValue("Bearer",secret);
  req.Content=new ByteArrayContent(bytes);req.Content.Headers.ContentType=new MediaTypeHeaderValue(contentType);
  using var response=await clients.CreateClient().SendAsync(req,ct);if(!response.IsSuccessStatusCode)throw new InvalidOperationException("上傳至圖片儲存空間失敗，請檢查 bucket 與權限設定。");
 }
 public async Task Delete(string key,CancellationToken ct)
 {
  if(!IsOwnedKey(key))return;var (baseUrl,bucket,secret)=Settings();
  using var req=new HttpRequestMessage(HttpMethod.Delete,$"{baseUrl.ToString().TrimEnd('/')}/storage/v1/object/{Uri.EscapeDataString(bucket)}/{string.Join('/',key.Split('/').Select(Uri.EscapeDataString))}");
  req.Headers.Add("apikey",secret);if(secret.StartsWith("eyJ",StringComparison.Ordinal))req.Headers.Authorization=new AuthenticationHeaderValue("Bearer",secret);
  using var response=await clients.CreateClient().SendAsync(req,ct);if(!response.IsSuccessStatusCode && response.StatusCode!=System.Net.HttpStatusCode.NotFound)throw new InvalidOperationException("刪除雲端圖片失敗，請稍後重試。");
 }
}
