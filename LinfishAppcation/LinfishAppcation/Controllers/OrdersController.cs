using System.Security.Claims;
using LinfishAppcation.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using LinfishAppcation.Services;

namespace LinfishAppcation.Controllers;

[ApiController, Route("api/orders"), Authorize]
public sealed class OrdersController(AppDbContext db) : ControllerBase
{
    private NpgsqlConnection Connection => (NpgsqlConnection)db.Database.GetDbConnection();
    public sealed record OrderInput(string? RecipientName,string? RecipientPhone,string? ShippingAddress,List<CheckoutItem>? Items,long? ShippingMethodId,decimal? ExpectedTotal);
    public sealed record QuoteInput(List<CheckoutItem>? Items,long? ShippingMethodId);

    [HttpPost("quote"), Authorize(Roles="member")]
    public async Task<IActionResult> Quote(QuoteInput input,CancellationToken ct)
    {
        try { await Connection.OpenAsync(ct);var quote=await CheckoutCalculator.Calculate(Connection,null,input.Items,input.ShippingMethodId,false,ct);return Ok(quote); }
        catch(CheckoutException e){return BadRequest(new {message=e.Message});}
    }

    [HttpPost, Authorize(Roles="member")]
    public async Task<IActionResult> Create(OrderInput input,CancellationToken ct)
    {
        var userIdText=User.FindFirstValue("sub");
        if(!Guid.TryParse(userIdText,out var userId)) return Unauthorized();
        var name=input.RecipientName?.Trim(); var phone=input.RecipientPhone?.Trim(); var address=input.ShippingAddress?.Trim();
        if(string.IsNullOrWhiteSpace(name) || name.Length>100 || string.IsNullOrWhiteSpace(phone) || phone.Length>30 || string.IsNullOrWhiteSpace(address) || address.Length>500 || input.Items is null || input.Items.Any(x=>!x.ExpectedUnitPrice.HasValue) || !input.ShippingMethodId.HasValue || !input.ExpectedTotal.HasValue)
            return BadRequest(new {message="請檢查收件資料及商品數量。"});
        var member=await db.Members.AsNoTracking().SingleOrDefaultAsync(m=>m.Id==userId,ct);
        if(member is null || string.IsNullOrWhiteSpace(member.UserNo) || member.UserNo.Length>30 || string.IsNullOrWhiteSpace(member.UserEmail) || member.UserEmail.Length>254) return BadRequest(new {message="會員資料不完整，無法建立訂單。"});
        await Connection.OpenAsync(ct); await using var tx=await Connection.BeginTransactionAsync(ct);
        try {
            await using var customer=new NpgsqlCommand("""
                insert into cmepms.customer(customer_no,customer_name,email,phone)
                values(@no,@name,@email,@phone)
                on conflict(customer_no) do update set customer_name=excluded.customer_name,phone=excluded.phone,upd_date=now()
                where lower(cmepms.customer.email)=lower(excluded.email) and cmepms.customer.is_active
                returning id
                """,Connection,tx);
            customer.Parameters.AddWithValue("no",member.UserNo); customer.Parameters.AddWithValue("name",member.UserName); customer.Parameters.AddWithValue("email",member.UserEmail); customer.Parameters.Add("phone",NpgsqlTypes.NpgsqlDbType.Varchar).Value=(object?)member.UserPhone ?? DBNull.Value;
            var customerValue=await customer.ExecuteScalarAsync(ct); if(customerValue is null) return Conflict(new {message="會員資料無法對應，請聯絡管理員。"});
            var quote=await CheckoutCalculator.Calculate(Connection,tx,input.Items,input.ShippingMethodId,true,ct);
            if(quote.Total!=input.ExpectedTotal.Value) return Conflict(new {message="稅額或運費已變更，請重新確認訂單金額。"});
            foreach(var line in quote.Lines){var units=(long)line.Quantity*line.UnitsPerSale;if(units>int.MaxValue)throw new CheckoutException("商品數量超過限制。");await using var stock=new NpgsqlCommand("update cmepms.product_inventory set stock_qty=stock_qty-@qty,upd_date=now() where id=@id and stock_qty>=@qty",Connection,tx);stock.Parameters.AddWithValue("id",line.InventoryId);stock.Parameters.AddWithValue("qty",(int)units);if(await stock.ExecuteNonQueryAsync(ct)!=1)throw new CheckoutException("商品庫存不足，請重新確認購物車。");}
            var no="LF"+Guid.NewGuid().ToString("N").ToUpperInvariant();
            await using var order=new NpgsqlCommand("insert into cmepms.orders(order_no,customer_id,order_status,subtotal,shipping_fee,discount_amount,total_amount,recipient_name,recipient_phone,shipping_address,shipping_method_id,shipping_method_name,tax_amount) values(@no,@customer,'PENDING',@subtotal,@shipping,0,@total,@name,@phone,@address,@method,@method_name,@tax) returning id",Connection,tx);
            order.Parameters.AddWithValue("no",no); order.Parameters.AddWithValue("customer",(long)customerValue); order.Parameters.AddWithValue("subtotal",quote.Subtotal); order.Parameters.AddWithValue("shipping",quote.ShippingFee); order.Parameters.AddWithValue("total",quote.Total); order.Parameters.AddWithValue("name",name); order.Parameters.AddWithValue("phone",phone); order.Parameters.AddWithValue("address",address);order.Parameters.AddWithValue("method",quote.SelectedShippingId);order.Parameters.AddWithValue("method_name",quote.ShippingName);order.Parameters.AddWithValue("tax",quote.TaxAmount);
            var orderId=(long)(await order.ExecuteScalarAsync(ct))!;
            foreach(var line in quote.Lines) {
                await using var cmd=new NpgsqlCommand("insert into cmepms.order_item(order_id,sku_id,product_name,sku_name,sku_no,unit_price,quantity,line_amount,tax_name,tax_rate_percent,price_includes_tax,tax_amount) values(@order,@sku,@product,@name,@no,@price,@qty,@amount,@tax_name,@rate,@included,@tax)",Connection,tx);
                cmd.Parameters.AddWithValue("order",orderId); cmd.Parameters.AddWithValue("sku",line.SkuId); cmd.Parameters.AddWithValue("product",line.ProductName); cmd.Parameters.AddWithValue("name",line.SkuName); cmd.Parameters.AddWithValue("no",line.SkuNo); cmd.Parameters.AddWithValue("price",line.UnitPrice); cmd.Parameters.AddWithValue("qty",line.Quantity); cmd.Parameters.AddWithValue("amount",line.UnitPrice*line.Quantity+line.AdditionalTax);cmd.Parameters.AddWithValue("tax_name",line.TaxName);cmd.Parameters.AddWithValue("rate",line.TaxRate);cmd.Parameters.AddWithValue("included",line.IncludesTax);cmd.Parameters.AddWithValue("tax",line.TaxAmount); await cmd.ExecuteNonQueryAsync(ct);
            }
            await tx.CommitAsync(ct); return Ok(new {id=orderId,orderNo=no,total=quote.Total});
        } catch(CheckoutException ex) { return Conflict(new {message=ex.Message});
        } catch(PostgresException ex) when(ex.SqlState==PostgresErrorCodes.UniqueViolation) { return Conflict(new {message="會員或訂單資料衝突，請聯絡管理員。"}); }
    }

    [HttpGet]
    public async Task<IActionResult> Mine(CancellationToken ct) => await ListOrders(false,ct);
    [HttpGet("admin"), Authorize(Roles="admin")]
    public async Task<IActionResult> Admin(CancellationToken ct) => await ListOrders(true,ct);
    [HttpGet("admin/stats"), Authorize(Roles="admin")]
    public async Task<IActionResult> AdminStats(CancellationToken ct)
    {
        await Connection.OpenAsync(ct);await using var cmd=new NpgsqlCommand("""
            with data as (select o.order_status,o.total_amount,exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID') as paid from cmepms.orders o)
            select count(*),count(*) filter(where not paid and order_status<>'CANCELLED'),count(*) filter(where paid and order_status in ('PENDING','PROCESSING')),
             count(*) filter(where order_status='SHIPPED'),count(*) filter(where order_status='CANCELLED'),count(*) filter(where paid),
             coalesce(sum(total_amount),0),coalesce(sum(total_amount) filter(where paid),0),coalesce(sum(total_amount) filter(where order_status='CANCELLED'),0),
             (select coalesce(sum(refund_amount),0) from cmepms.after_sale where refunded_at is not null)
            from data
            """,Connection);await using var r=await cmd.ExecuteReaderAsync(ct);await r.ReadAsync(ct);return Ok(new{totalOrders=r.GetInt64(0),pendingPayment=r.GetInt64(1),pendingShipment=r.GetInt64(2),shipped=r.GetInt64(3),cancelled=r.GetInt64(4),paidOrders=r.GetInt64(5),totalAmount=r.GetDecimal(6),paidAmount=r.GetDecimal(7),cancelledAmount=r.GetDecimal(8),refundedAmount=r.GetDecimal(9)});
    }
    private async Task<IActionResult> ListOrders(bool admin,CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct);
        await using var cmd=new NpgsqlCommand("select o.id,o.order_no,o.order_status,o.total_amount,o.ordered_at,c.customer_no,c.customer_name,exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID') from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where @admin or (c.customer_no=@member and lower(c.email)=lower(@email)) order by o.id desc",Connection);
        cmd.Parameters.AddWithValue("admin",admin); cmd.Parameters.AddWithValue("member",member.UserNo); cmd.Parameters.AddWithValue("email",member.UserEmail);
        await using var r=await cmd.ExecuteReaderAsync(ct); var list=new List<object>();
        while(await r.ReadAsync(ct)) list.Add(new {id=r.GetInt64(0),orderNo=r.GetString(1),status=r.GetString(2),total=r.GetDecimal(3),orderedAt=r.GetDateTime(4),customerNo=r.GetString(5),customerName=r.GetString(6),isPaid=r.GetBoolean(7)});
        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Detail(long id,CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct); var admin=User.IsInRole("admin");
        await using var cmd=new NpgsqlCommand("select o.order_no,o.order_status,o.subtotal,o.shipping_fee,o.discount_amount,o.total_amount,o.recipient_name,o.recipient_phone,o.shipping_address,o.ordered_at,c.customer_no,c.customer_name,exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID'),o.tax_amount,o.shipping_method_name from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where o.id=@id and (@admin or (c.customer_no=@member and lower(c.email)=lower(@email)))",Connection);
        cmd.Parameters.AddWithValue("id",id); cmd.Parameters.AddWithValue("admin",admin); cmd.Parameters.AddWithValue("member",member.UserNo); cmd.Parameters.AddWithValue("email",member.UserEmail);
        object header;
        await using(var r=await cmd.ExecuteReaderAsync(ct)) { if(!await r.ReadAsync(ct)) return NotFound(); header=new {id,orderNo=r.GetString(0),status=r.GetString(1),subtotal=r.GetDecimal(2),shipping=r.GetDecimal(3),discount=r.GetDecimal(4),total=r.GetDecimal(5),recipientName=r.GetString(6),recipientPhone=r.GetString(7),shippingAddress=r.GetString(8),orderedAt=r.GetDateTime(9),customerNo=r.GetString(10),customerName=r.GetString(11),isPaid=r.GetBoolean(12),taxAmount=r.GetDecimal(13),shippingMethodName=r.IsDBNull(14)?null:r.GetString(14)}; }
        await using var lines=new NpgsqlCommand("select id,product_name,sku_name,sku_no,unit_price,quantity,line_amount,tax_name,tax_rate_percent,price_includes_tax,tax_amount,units_per_sale from cmepms.order_item where order_id=@id order by id",Connection); lines.Parameters.AddWithValue("id",id);
        await using var reader=await lines.ExecuteReaderAsync(ct); var items=new List<object>(); while(await reader.ReadAsync(ct)) items.Add(new {id=reader.GetInt64(0),productName=reader.GetString(1),skuName=reader.GetString(2),skuNo=reader.GetString(3),unitPrice=reader.GetDecimal(4),quantity=reader.GetInt32(5),amount=reader.GetDecimal(6),taxName=reader.IsDBNull(7)?null:reader.GetString(7),taxRate=reader.IsDBNull(8)?(decimal?)null:reader.GetDecimal(8),priceIncludesTax=reader.IsDBNull(9)?(bool?)null:reader.GetBoolean(9),taxAmount=reader.IsDBNull(10)?(decimal?)null:reader.GetDecimal(10),unitsPerSale=reader.GetInt32(11)});
        return Ok(new {order=header,items});
    }

    public sealed record StatusInput(string? Status);
    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> Cancel(long id,CancellationToken ct)
    {
        if(!Guid.TryParse(User.FindFirstValue("sub"),out var userId))return Unauthorized();
        var member=await db.Members.AsNoTracking().SingleOrDefaultAsync(m=>m.Id==userId,ct);
        if(member is null || string.IsNullOrWhiteSpace(member.UserEmail))return Unauthorized();
        await Connection.OpenAsync(ct);await using var tx=await Connection.BeginTransactionAsync(ct);
        await using var order=new NpgsqlCommand("select o.order_status from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where o.id=@id and (@admin or (c.customer_no=@no and lower(c.email)=lower(@email))) for update of o",Connection,tx);
        order.Parameters.AddWithValue("id",id);order.Parameters.AddWithValue("admin",User.IsInRole("admin"));order.Parameters.AddWithValue("no",member.UserNo);order.Parameters.AddWithValue("email",member.UserEmail);
        var status=await order.ExecuteScalarAsync(ct) as string;if(status is null)return NotFound();
        if(status == "CANCELLED" || (!User.IsInRole("admin") && status is not ("PENDING" or "PROCESSING")))return Conflict(new {message="此訂單狀態無法取消。"});
        await using var paid=new NpgsqlCommand("select exists(select 1 from cmepms.payment where order_id=@id and payment_status='PAID')",Connection,tx);paid.Parameters.AddWithValue("id",id);
        if((bool)(await paid.ExecuteScalarAsync(ct))! && !User.IsInRole("admin"))return Conflict(new {message="訂單已付款，不能取消；如需售後協助請聯絡管理員。"});
        await using var items=new NpgsqlCommand("select i.inventory_id,sum(i.quantity::bigint*i.units_per_sale-coalesce((select sum(x.quantity) from cmepms.after_sale_item x where x.order_item_id=i.id and x.restocked_at is not null),0))::integer from cmepms.order_item i where i.order_id=@id group by i.inventory_id order by i.inventory_id",Connection,tx);items.Parameters.AddWithValue("id",id);
        var quantities=new List<(long Id,int Quantity)>();await using(var r=await items.ExecuteReaderAsync(ct)){while(await r.ReadAsync(ct))quantities.Add((r.GetInt64(0),r.GetInt32(1)));}
        foreach(var item in quantities){await using var restore=new NpgsqlCommand("update cmepms.product_inventory set stock_qty=stock_qty+@qty,upd_date=now() where id=@sku",Connection,tx);restore.Parameters.AddWithValue("qty",item.Quantity);restore.Parameters.AddWithValue("sku",item.Id);if(await restore.ExecuteNonQueryAsync(ct)!=1)throw new InvalidOperationException("訂單規格不存在，無法回補庫存。");}
        await using var update=new NpgsqlCommand("update cmepms.orders set order_status='CANCELLED',upd_date=now() where id=@id",Connection,tx);update.Parameters.AddWithValue("id",id);await update.ExecuteNonQueryAsync(ct);
        await tx.CommitAsync(ct);return NoContent();
    }

    [HttpPost("{id:long}/confirm-payment"), Authorize(Roles="admin")]
    public async Task<IActionResult> ConfirmPayment(long id,CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var adminId)) return Unauthorized();
        await Connection.OpenAsync(ct); await using var tx=await Connection.BeginTransactionAsync(ct);
        await using var locked=new NpgsqlCommand("select order_status,total_amount from cmepms.orders where id=@id for update",Connection,tx);
        locked.Parameters.AddWithValue("id",id); string status; decimal total;
        await using(var r=await locked.ExecuteReaderAsync(ct)){if(!await r.ReadAsync(ct))return NotFound();status=r.GetString(0);total=r.GetDecimal(1);}
        if(status=="CANCELLED")return Conflict(new {message="訂單已取消，不能確認付款。"});
        await using var paid=new NpgsqlCommand("select exists(select 1 from cmepms.payment where order_id=@id and payment_status='PAID')",Connection,tx);paid.Parameters.AddWithValue("id",id);
        if((bool)(await paid.ExecuteScalarAsync(ct))!)return Conflict(new {message="訂單已確認付款。"});
        await using var insert=new NpgsqlCommand("insert into cmepms.payment(order_id,payment_no,payment_method,payment_status,amount,paid_at,confirmed_by) values(@id,@no,'MANUAL','PAID',@amount,now(),@admin)",Connection,tx);
        insert.Parameters.AddWithValue("id",id);insert.Parameters.AddWithValue("no","PM"+Guid.NewGuid().ToString("N").ToUpperInvariant());insert.Parameters.AddWithValue("amount",total);insert.Parameters.AddWithValue("admin",adminId);
        await insert.ExecuteNonQueryAsync(ct);await tx.CommitAsync(ct);return NoContent();
    }
    [HttpPut("{id:long}/status"), Authorize(Roles="admin")]
    public async Task<IActionResult> ChangeStatus(long id,StatusInput input,CancellationToken ct)
    {
        if(input.Status is not ("PROCESSING" or "SHIPPED" or "COMPLETED")) return BadRequest(new {message="訂單狀態不正確。"});
        await Connection.OpenAsync(ct); await using var cmd=new NpgsqlCommand("update cmepms.orders set order_status=@status,upd_date=now() where id=@id and ((order_status='PENDING' and @status='PROCESSING') or (order_status='PROCESSING' and @status='SHIPPED' and exists(select 1 from cmepms.payment where order_id=@id and payment_status='PAID')) or (order_status='SHIPPED' and @status='COMPLETED'))",Connection);
        cmd.Parameters.AddWithValue("status",input.Status); cmd.Parameters.AddWithValue("id",id);
        return await cmd.ExecuteNonQueryAsync(ct)==1 ? NoContent() : Conflict(new {message="訂單不存在、狀態已變更，或尚未確認付款。"});
    }
}
