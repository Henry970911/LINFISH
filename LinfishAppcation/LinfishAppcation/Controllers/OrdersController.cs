using System.Security.Claims;
using System.Security.Cryptography;
using LinfishAppcation.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using LinfishAppcation.Services;

namespace LinfishAppcation.Controllers;

[ApiController, Route("api/orders"), Authorize]
public sealed class OrdersController(AppDbContext db, InventoryNotifications inventoryNotifications) : ControllerBase
{
    private NpgsqlConnection Connection => (NpgsqlConnection)db.Database.GetDbConnection();
    public sealed record OrderInput(string? RecipientName, string? RecipientPhone, string? ShippingAddress, List<CheckoutItem>? Items, long? ShippingMethodId, decimal? ExpectedTotal);
    public sealed record QuoteInput(List<CheckoutItem>? Items, long? ShippingMethodId);

    // 2026-11-27：刪除未付款訂單及其商品明細；保留付款、售後及核對中的訂單。
    [HttpDelete("{id:long}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        await using (var check = new NpgsqlCommand("select coalesce(o.stat,''), exists(select 1 from cmepms.payment p where p.order_id=o.id), exists(select 1 from cmepms.after_sale a where a.order_id=o.id) from cmepms.orders o where o.id=@id for update of o", Connection, tx))
        {
            check.Parameters.AddWithValue("id", id);
            await using var reader = await check.ExecuteReaderAsync(ct);
            if (!await reader.ReadAsync(ct)) return NotFound();
            if (reader.GetString(0) is not ("" or "10" or "ZZ") || reader.GetBoolean(1) || reader.GetBoolean(2))
                return Conflict(new { message = "此訂單有付款、售後紀錄或正在核對中，無法刪除。" });
        }
        try
        {
            await using (var items = new NpgsqlCommand("delete from cmepms.order_item where order_id=@id", Connection, tx)) { items.Parameters.AddWithValue("id", id); await items.ExecuteNonQueryAsync(ct); }
            await using (var order = new NpgsqlCommand("delete from cmepms.orders where id=@id", Connection, tx)) { order.Parameters.AddWithValue("id", id); await order.ExecuteNonQueryAsync(ct); }
            await tx.CommitAsync(ct);
            return NoContent();
        }
        catch (PostgresException e) when (e.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { message = "此訂單仍有其他關聯資料，無法刪除。" });
        }
    }

    [HttpPost("quote"), Authorize(Roles = "member")]
    public async Task<IActionResult> Quote(QuoteInput input, CancellationToken ct)
    {
        try { await Connection.OpenAsync(ct); var quote = await CheckoutCalculator.Calculate(Connection, null, input.Items, input.ShippingMethodId, false, ct); return Ok(quote); }
        catch (CheckoutException e) { return BadRequest(new { message = e.Message }); }
    }

    [HttpPost, Authorize(Roles = "member")]
    public async Task<IActionResult> Create(OrderInput input, CancellationToken ct)
    {
        var userIdText = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdText, out var userId)) return Unauthorized();
        var name = input.RecipientName?.Trim(); var phone = input.RecipientPhone?.Trim(); var address = input.ShippingAddress?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100 || string.IsNullOrWhiteSpace(phone) || phone.Length > 30 || string.IsNullOrWhiteSpace(address) || address.Length > 500 || input.Items is null || input.Items.Any(x => !x.ExpectedUnitPrice.HasValue) || !input.ShippingMethodId.HasValue || !input.ExpectedTotal.HasValue)
            return BadRequest(new { message = "請檢查收件資料及商品數量。" });
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserNo) || member.UserNo.Length > 30 || string.IsNullOrWhiteSpace(member.UserEmail) || member.UserEmail.Length > 254) return BadRequest(new { message = "會員資料不完整，無法建立訂單。" });
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        try
        {
            await using var customer = new NpgsqlCommand("""
                insert into cmepms.customer(customer_no,customer_name,email,phone)
                values(@no,@name,@email,@phone)
                on conflict(customer_no) do update set customer_name=excluded.customer_name,phone=excluded.phone,upd_date=now()
                where lower(cmepms.customer.email)=lower(excluded.email) and cmepms.customer.is_active
                returning id
                """, Connection, tx);
            customer.Parameters.AddWithValue("no", member.UserNo); customer.Parameters.AddWithValue("name", member.UserName); customer.Parameters.AddWithValue("email", member.UserEmail); customer.Parameters.Add("phone", NpgsqlTypes.NpgsqlDbType.Varchar).Value = (object?)member.UserPhone ?? DBNull.Value;
            var customerValue = await customer.ExecuteScalarAsync(ct); if (customerValue is null) return Conflict(new { message = "會員資料無法對應，請聯絡管理員。" });
            var quote = await CheckoutCalculator.Calculate(Connection, tx, input.Items, input.ShippingMethodId, true, ct);
            if (quote.Total != input.ExpectedTotal.Value) return Conflict(new { message = "稅額或運費已變更，請重新確認訂單金額。" });
            // 2026-11-27：訂單成立時只檢查現有庫存，不扣庫存；確認付款時才扣除。
            var year = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTimeOffset.UtcNow, "Asia/Taipei").Year;
            // Serialize number allocation for this year, including installations without an order_no unique index.
            await using (var allocationLock = new NpgsqlCommand("select pg_advisory_xact_lock(@key)", Connection, tx))
            {
                allocationLock.Parameters.AddWithValue("key", 0x4C460000L + year);
                await allocationLock.ExecuteNonQueryAsync(ct);
            }
            string no = ""; long orderId = 0;
            // 2026-11-27：新訂單的付款狀態設為 10（待付款）。
            await using var order = new NpgsqlCommand("insert into cmepms.orders(order_no,customer_id,stat,subtotal,shipping_fee,discount_amount,total_amount,recipient_name,recipient_phone,shipping_address,shipping_method_id,shipping_method_name,tax_amount) select @no,@customer,'10',@subtotal,@shipping,0,@total,@name,@phone,@address,@method,@method_name,@tax where not exists(select 1 from cmepms.orders where order_no=@no) on conflict do nothing returning id", Connection, tx);
            var numberParameter = order.Parameters.Add("no", NpgsqlTypes.NpgsqlDbType.Varchar);
            order.Parameters.AddWithValue("customer", (long)customerValue); order.Parameters.AddWithValue("subtotal", quote.Subtotal); order.Parameters.AddWithValue("shipping", quote.ShippingFee); order.Parameters.AddWithValue("total", quote.Total); order.Parameters.AddWithValue("name", name); order.Parameters.AddWithValue("phone", phone); order.Parameters.AddWithValue("address", address); order.Parameters.AddWithValue("method", quote.SelectedShippingId); order.Parameters.AddWithValue("method_name", quote.ShippingName); order.Parameters.AddWithValue("tax", quote.TaxAmount);
            for (var attempt = 0; attempt < 100; attempt++)
            {
                no = $"LF{year}{RandomNumberGenerator.GetInt32(10_000_000):D7}";
                numberParameter.Value = no;
                var inserted = await order.ExecuteScalarAsync(ct);
                if (inserted is long id) { orderId = id; break; }
            }
            if (orderId == 0) return Conflict(new { message = "無法產生不重複的訂單編號，請稍後再試。" });
            foreach (var line in quote.Lines)
            {
                await using var cmd = new NpgsqlCommand("insert into cmepms.order_item(order_id,sku_id,product_name,sku_name,sku_no,unit_price,quantity,line_amount,tax_name,tax_rate_percent,price_includes_tax,tax_amount) values(@order,@sku,@product,@name,@no,@price,@qty,@amount,@tax_name,@rate,@included,@tax)", Connection, tx);
                cmd.Parameters.AddWithValue("order", orderId); cmd.Parameters.AddWithValue("sku", line.SkuId); cmd.Parameters.AddWithValue("product", line.ProductName); cmd.Parameters.AddWithValue("name", line.SkuName); cmd.Parameters.AddWithValue("no", line.SkuNo); cmd.Parameters.AddWithValue("price", line.UnitPrice); cmd.Parameters.AddWithValue("qty", line.Quantity); cmd.Parameters.AddWithValue("amount", line.UnitPrice * line.Quantity + line.AdditionalTax); cmd.Parameters.AddWithValue("tax_name", line.TaxName); cmd.Parameters.AddWithValue("rate", line.TaxRate); cmd.Parameters.AddWithValue("included", line.IncludesTax); cmd.Parameters.AddWithValue("tax", line.TaxAmount); await cmd.ExecuteNonQueryAsync(ct);
            }
            await tx.CommitAsync(ct); return Ok(new { id = orderId, orderNo = no, total = quote.Total });
        }
        catch (CheckoutException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation) { return Conflict(new { message = "會員或訂單資料衝突，請聯絡管理員。" }); }
    }

    [HttpGet]
    public async Task<IActionResult> Mine(CancellationToken ct) => await ListOrders(false, ct);
    [HttpGet("admin"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Admin(CancellationToken ct) => await ListOrders(true, ct);
    [HttpGet("admin/stats"), Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminStats(CancellationToken ct)
    {
        // 2026-11-27：訂單統計以 stat 為準，出貨狀態待後續物流流程定義。
        await Connection.OpenAsync(ct); await using var cmd = new NpgsqlCommand("""
            select count(*),count(*) filter(where stat='10'),count(*) filter(where stat='ZZ'),count(*) filter(where stat in ('DD','30','40')),
                   coalesce(sum(total_amount),0),coalesce(sum(total_amount) filter(where stat in ('DD','30','40')),0),coalesce(sum(total_amount) filter(where stat='ZZ'),0),
                   (select coalesce(sum(refund_amount),0) from cmepms.after_sale where refunded_at is not null), count(*) filter(where stat='20')
              from cmepms.orders
            """, Connection); await using var r = await cmd.ExecuteReaderAsync(ct); await r.ReadAsync(ct);
        return Ok(new { totalOrders = r.GetInt64(0), pendingPayment = r.GetInt64(1), cancelled = r.GetInt64(2), paidOrders = r.GetInt64(3), totalAmount = r.GetDecimal(4), paidAmount = r.GetDecimal(5), cancelledAmount = r.GetDecimal(6), refundedAmount = r.GetDecimal(7), pendingVerification = r.GetInt64(8) });
    }
    private async Task<IActionResult> ListOrders(bool admin, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct);
        // 2026-11-27：訂單列表回傳 stat，讓會員與管理員同步查看付款及取消狀態。
        await using var cmd = new NpgsqlCommand("select o.id,o.order_no,o.stat,o.total_amount,o.ordered_at,c.customer_no,c.customer_name,exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID') from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where @admin or (c.customer_no=@member and lower(c.email)=lower(@email)) order by o.id desc", Connection);
        cmd.Parameters.AddWithValue("admin", admin); cmd.Parameters.AddWithValue("member", member.UserNo); cmd.Parameters.AddWithValue("email", member.UserEmail);
        await using var r = await cmd.ExecuteReaderAsync(ct); var list = new List<object>();
        while (await r.ReadAsync(ct)) list.Add(new { id = r.GetInt64(0), orderNo = r.GetString(1), total = r.GetDecimal(3), orderedAt = r.GetDateTime(4), customerNo = r.GetString(5), customerName = r.GetString(6), isPaid = r.GetBoolean(7), stat = r.IsDBNull(2) ? null : r.GetString(2) });
        return Ok(list);
    }

    // 2026-11-27：訂單明細包含顧客回報的轉帳資料，供本人及管理員核對。
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Detail(long id, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct); var admin = User.IsInRole("admin");
        await using var cmd = new NpgsqlCommand("select o.order_no,o.stat,o.subtotal,o.shipping_fee,o.discount_amount,o.total_amount,o.recipient_name,o.recipient_phone,o.shipping_address,o.ordered_at,c.customer_no,c.customer_name,exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID'),o.tax_amount,o.shipping_method_name,o.transfer_last_four,o.transfer_reported_at,o.tracking_number,o.shipped_at from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where o.id=@id and (@admin or (c.customer_no=@member and lower(c.email)=lower(@email)))", Connection);
        cmd.Parameters.AddWithValue("id", id); cmd.Parameters.AddWithValue("admin", admin); cmd.Parameters.AddWithValue("member", member.UserNo); cmd.Parameters.AddWithValue("email", member.UserEmail);
        object header;
        await using (var r = await cmd.ExecuteReaderAsync(ct)) { if (!await r.ReadAsync(ct)) return NotFound(); header = new { id, orderNo = r.GetString(0), subtotal = r.GetDecimal(2), shipping = r.GetDecimal(3), discount = r.GetDecimal(4), total = r.GetDecimal(5), recipientName = r.GetString(6), recipientPhone = r.GetString(7), shippingAddress = r.GetString(8), orderedAt = r.GetDateTime(9), customerNo = r.GetString(10), customerName = r.GetString(11), isPaid = r.GetBoolean(12), taxAmount = r.GetDecimal(13), shippingMethodName = r.IsDBNull(14) ? null : r.GetString(14), transferLastFour = r.IsDBNull(15) ? null : r.GetString(15), transferReportedAt = r.IsDBNull(16) ? (DateTime?)null : r.GetDateTime(16), trackingNumber = r.IsDBNull(17) ? null : r.GetString(17), shippedAt = r.IsDBNull(18) ? (DateTime?)null : r.GetDateTime(18), stat = r.IsDBNull(1) ? null : r.GetString(1) }; }
        await using var lines = new NpgsqlCommand("select id,product_name,sku_name,sku_no,unit_price,quantity,line_amount,tax_name,tax_rate_percent,price_includes_tax,tax_amount,units_per_sale from cmepms.order_item where order_id=@id order by id", Connection); lines.Parameters.AddWithValue("id", id);
        await using var reader = await lines.ExecuteReaderAsync(ct); var items = new List<object>(); while (await reader.ReadAsync(ct)) items.Add(new { id = reader.GetInt64(0), productName = reader.GetString(1), skuName = reader.GetString(2), skuNo = reader.GetString(3), unitPrice = reader.GetDecimal(4), quantity = reader.GetInt32(5), amount = reader.GetDecimal(6), taxName = reader.IsDBNull(7) ? null : reader.GetString(7), taxRate = reader.IsDBNull(8) ? (decimal?)null : reader.GetDecimal(8), priceIncludesTax = reader.IsDBNull(9) ? (bool?)null : reader.GetBoolean(9), taxAmount = reader.IsDBNull(10) ? (decimal?)null : reader.GetDecimal(10), unitsPerSale = reader.GetInt32(11) });
        return Ok(new { order = header, items });
    }

    // 2026-11-27：會員回報轉出帳號後四碼；實際收款仍由管理員確認。
    public sealed record TransferInput(string? LastFour);
    [HttpPost("{id:long}/transfer-report"), Authorize(Roles = "member")]
    public async Task<IActionResult> ReportTransfer(long id, TransferInput input, CancellationToken ct)
    {
        var lastFour = input.LastFour?.Trim();
        if (lastFour is null || lastFour.Length != 4 || lastFour.Any(c => c < '0' || c > '9'))
            return BadRequest(new { message = "請輸入轉帳帳號後四碼，限四位數字。" });
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        await using var locked = new NpgsqlCommand("select o.stat,exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID') from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where o.id=@id and c.customer_no=@no and lower(c.email)=lower(@email) for update of o", Connection, tx);
        locked.Parameters.AddWithValue("id", id); locked.Parameters.AddWithValue("no", member.UserNo); locked.Parameters.AddWithValue("email", member.UserEmail);
        string status; bool paid;
        await using (var reader = await locked.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct)) return NotFound();
            status = reader.IsDBNull(0) ? "" : reader.GetString(0); paid = reader.GetBoolean(1);
        }
        // 2026-11-27：提交或更正轉帳資料後，訂單進入 20 核對中。
        if (paid || status is not ("10" or "20")) return Conflict(new { message = "此訂單目前無法提交轉帳資料。" });
        await using var update = new NpgsqlCommand("update cmepms.orders set transfer_last_four=@last,transfer_reported_at=now(),stat='20',upd_date=now() where id=@id", Connection, tx);
        update.Parameters.AddWithValue("last", lastFour); update.Parameters.AddWithValue("id", id);
        await update.ExecuteNonQueryAsync(ct); await tx.CommitAsync(ct); return NoContent();
    }

    public sealed record StatusInput(string? Status);
    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> Cancel(long id, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using var order = new NpgsqlCommand("select coalesce(o.stat,'') from cmepms.orders o join cmepms.customer c on c.id=o.customer_id where o.id=@id and (@admin or (c.customer_no=@no and lower(c.email)=lower(@email))) for update of o", Connection, tx);
        order.Parameters.AddWithValue("id", id); order.Parameters.AddWithValue("admin", User.IsInRole("admin")); order.Parameters.AddWithValue("no", member.UserNo); order.Parameters.AddWithValue("email", member.UserEmail);
        var status = await order.ExecuteScalarAsync(ct) as string; if (status is null) return NotFound();
        if (status != "10") return Conflict(new { message = "此訂單狀態無法取消。" });
        // 2026-11-27：禁止會員及管理員透過一般取消流程取消已付款訂單。
        await using var paid = new NpgsqlCommand("select coalesce(stat='DD',false) or exists(select 1 from cmepms.payment where order_id=@id and payment_status='PAID') from cmepms.orders where id=@id", Connection, tx); paid.Parameters.AddWithValue("id", id);
        if ((bool)(await paid.ExecuteScalarAsync(ct))!) return Conflict(new { message = "訂單已付款，不能取消；如有問題請透過售後處理。" });
        // 2026-11-27：提交轉帳資料後由管理員核對，避免顧客自行取消已轉帳的訂單。
        if (!User.IsInRole("admin"))
        {
            await using var reported = new NpgsqlCommand("select transfer_reported_at is not null from cmepms.orders where id=@id", Connection, tx);
            reported.Parameters.AddWithValue("id", id);
            if ((bool)(await reported.ExecuteScalarAsync(ct))!) return Conflict(new { message = "已提交轉帳資料，如需取消請聯絡管理員核對退款。" });
        }
        // 2026-11-27：未付款訂單尚未扣庫存，取消時不回補。
        // 2026-11-27：取消訂單時同步標記 ZZ，並保留原付款紀錄。
        await using var update = new NpgsqlCommand("update cmepms.orders set stat='ZZ',upd_date=now() where id=@id", Connection, tx); update.Parameters.AddWithValue("id", id); await update.ExecuteNonQueryAsync(ct);
        await tx.CommitAsync(ct); return NoContent();
    }

    // 2026-11-27：管理員核對未通過時退回待付款，保留原轉帳資料供追查。
    [HttpPost("{id:long}/reject-transfer"), Authorize(Roles = "admin")]
    public async Task<IActionResult> RejectTransfer(long id, CancellationToken ct)
    {
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        await using var cmd = new NpgsqlCommand("update cmepms.orders set stat='10',upd_date=now() where id=@id and stat='20' and not exists(select 1 from cmepms.payment p where p.order_id=@id and p.payment_status='PAID') returning id", Connection, tx);
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteScalarAsync(ct) is null) return Conflict(new { message = "訂單狀態已變更，無法退回待付款。" });
        await tx.CommitAsync(ct); return NoContent();
    }

    [HttpPost("{id:long}/confirm-payment"), Authorize(Roles = "admin")]
    public async Task<IActionResult> ConfirmPayment(long id, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var adminId)) return Unauthorized();
        await Connection.OpenAsync(ct); await using var tx = await Connection.BeginTransactionAsync(ct);
        await using var locked = new NpgsqlCommand("select coalesce(stat,''),total_amount from cmepms.orders where id=@id for update", Connection, tx);
        locked.Parameters.AddWithValue("id", id); string status; decimal total;
        await using (var r = await locked.ExecuteReaderAsync(ct)) { if (!await r.ReadAsync(ct)) return NotFound(); status = r.GetString(0); total = r.GetDecimal(1); }
        // 2026-11-27：核對中訂單可人工確認收款；保留原有待付款人工確認流程。
        if (status is not ("10" or "20")) return Conflict(new { message = "只有待付款或核對中訂單才能確認付款。" });
        await using var paid = new NpgsqlCommand("select exists(select 1 from cmepms.payment where order_id=@id and payment_status='PAID')", Connection, tx); paid.Parameters.AddWithValue("id", id);
        if ((bool)(await paid.ExecuteScalarAsync(ct))!) return Conflict(new { message = "訂單已確認付款。" });
        // 2026-11-27：確認付款時依訂單快照彙總實際庫存數量，與付款及狀態變更同一交易。
        var quantities = new List<(long InventoryId, long Quantity)>();
        await using (var items = new NpgsqlCommand("select inventory_id, sum(quantity::bigint * units_per_sale::bigint)::bigint, bool_or(quantity is null or units_per_sale is null or quantity <= 0 or units_per_sale <= 0) from cmepms.order_item where order_id=@id group by inventory_id order by inventory_id", Connection, tx))
        {
            items.Parameters.AddWithValue("id", id);
            await using var reader = await items.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                if (reader.IsDBNull(0) || reader.IsDBNull(1) || reader.GetBoolean(2)) return Conflict(new { message = "訂單庫存資料不完整，請聯絡管理員處理。" });
                quantities.Add((reader.GetInt64(0), reader.GetInt64(1)));
            }
        }
        if (quantities.Count == 0) return Conflict(new { message = "訂單沒有商品明細，無法確認付款。" });
        foreach (var item in quantities)
        {
            if (item.Quantity <= 0 || item.Quantity > int.MaxValue) return Conflict(new { message = "訂單商品數量不正確，無法確認付款。" });
            await using var stock = new NpgsqlCommand("update cmepms.product_inventory set stock_qty=stock_qty-@qty,upd_date=now() where id=@id and stock_qty>=@qty", Connection, tx);
            stock.Parameters.AddWithValue("id", item.InventoryId); stock.Parameters.AddWithValue("qty", (int)item.Quantity);
            if (await stock.ExecuteNonQueryAsync(ct) != 1) return Conflict(new { message = "商品庫存不足或庫存資料不存在，尚未確認付款及扣庫存；請先核對並人工處理已收到的款項。" });
        }
        await using var insert = new NpgsqlCommand("insert into cmepms.payment(order_id,payment_no,payment_method,payment_status,amount,paid_at,confirmed_by) values(@id,@no,'MANUAL','PAID',@amount,now(),@admin)", Connection, tx);
        insert.Parameters.AddWithValue("id", id); insert.Parameters.AddWithValue("no", "PM" + Guid.NewGuid().ToString("N").ToUpperInvariant()); insert.Parameters.AddWithValue("amount", total); insert.Parameters.AddWithValue("admin", adminId);
        // 2026-11-27：付款紀錄與訂單 stat=DD 在同一交易中儲存。
        await insert.ExecuteNonQueryAsync(ct);
        await using var updateStat = new NpgsqlCommand("update cmepms.orders set stat='DD',upd_date=now() where id=@id", Connection, tx);
        updateStat.Parameters.AddWithValue("id", id); await updateStat.ExecuteNonQueryAsync(ct);
        await tx.CommitAsync(ct);
        // 2026-11-27：交易確實完成後才通知所有前後台更新庫存。
        inventoryNotifications.Publish(); return NoContent();
    }
    // 2026-11-27：管理員填寫黑貓託運單號並確認出貨；更正單號保留第一次出貨時間。
    public sealed record ShippingInput(string? TrackingNumber);
    [HttpPost("{id:long}/shipment"), Authorize(Roles = "admin")]
    public async Task<IActionResult> RecordShipment(long id, ShippingInput input, CancellationToken ct)
    {
        var raw = input.TrackingNumber?.Trim() ?? "";
        if (raw.Any(c => (c < '0' || c > '9') && c != '-' && c != ' ')) return BadRequest(new { message = "託運單號只能包含數字、空格或連字號。" });
        var number = raw.Replace("-", "").Replace(" ", "");
        if (number.Length is not (10 or 12)) return BadRequest(new { message = "請輸入 10 碼或 12 碼託運單號。" });
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        await using var cmd = new NpgsqlCommand("update cmepms.orders set tracking_number=@number, shipped_at=coalesce(shipped_at,now()), stat='30', upd_date=now() where id=@id and stat in ('DD','30') and exists(select 1 from cmepms.payment p where p.order_id=@id and p.payment_status='PAID') returning id", Connection, tx);
        cmd.Parameters.AddWithValue("number", number); cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteScalarAsync(ct) is null) return Conflict(new { message = "訂單狀態已變更，只有已確認付款或已出貨的訂單可管理單號。" });
        await tx.CommitAsync(ct); return NoContent();
    }
    // 2026-11-27：會員本人或管理員確認送達後，已出貨訂單轉為 40 已完成。
    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var userId)) return Unauthorized();
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == userId, ct);
        if (member is null || string.IsNullOrWhiteSpace(member.UserEmail)) return Unauthorized();
        await Connection.OpenAsync(ct);
        await using var tx = await Connection.BeginTransactionAsync(ct);
        await using var cmd = new NpgsqlCommand("update cmepms.orders o set stat='40',upd_date=now() from cmepms.customer c where o.id=@id and o.customer_id=c.id and (@admin or (c.customer_no=@no and lower(c.email)=lower(@email))) and o.stat='30' and o.tracking_number is not null and o.shipped_at is not null and exists(select 1 from cmepms.payment p where p.order_id=o.id and p.payment_status='PAID') returning o.id", Connection, tx);
        cmd.Parameters.AddWithValue("id", id); cmd.Parameters.AddWithValue("admin", User.IsInRole("admin"));
        cmd.Parameters.AddWithValue("no", member.UserNo); cmd.Parameters.AddWithValue("email", member.UserEmail);
        if (await cmd.ExecuteScalarAsync(ct) is null) return Conflict(new { message = "訂單不存在、無權操作或狀態已變更；請重新整理後確認。" });
        await tx.CommitAsync(ct); return NoContent();
    }
}
