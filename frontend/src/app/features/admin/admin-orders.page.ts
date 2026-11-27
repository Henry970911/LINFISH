import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { orderStatusName } from '../account/order-status';
import { AfterSale, OrderDetail, OrderService, OrderStats, OrderSummary } from '../../core/services/order.service';

// 2026-11-27：訂單明細顯示顧客回報的轉帳後四碼與時間，供人工核對。
@Component({
    selector: 'app-admin-orders-page', standalone: true, imports: [CurrencyPipe, DatePipe, FormsModule], template: `
<!-- 2026-11-27：精簡頁面標題及上方留白。 -->
<div class="admin-page-head orders-page-head"><div><h1>會員訂單</h1></div></div>
<p role="status">{{message()}}</p>@if(stats();as s){<section class="admin-card editor-card"><h2>訂單概況</h2><div class="stats"><div><small>訂單總數</small><b>{{s.totalOrders}}</b></div><div><small>待付款</small><b>{{s.pendingPayment}}</b></div><div><small>核對中</small><b>{{s.pendingVerification}}</b></div><div><small>已取消</small><b>{{s.cancelled}}</b></div></div><p>訂單金額合計 {{s.totalAmount | currency:'TWD':'NT$'}} · 已付款 {{s.paidAmount | currency:'TWD':'NT$'}}（{{s.paidOrders}} 筆） · 已取消 {{s.cancelledAmount | currency:'TWD':'NT$'}} · 已確認退款 {{s.refundedAmount | currency:'TWD':'NT$'}}</p></section>}<!-- 2026-11-27：訂單列表依欄位排列，避免文字與金額重疊。 -->
<section class="admin-card editor-card order-list-card">
  <div class="order-list-heading"><div><h2>訂單列表</h2><p>查看訂單與會員資料</p></div><span>{{orders().length}} 筆訂單</span></div>
  @if(orders().length){
    <div class="order-table-wrap" role="region" aria-label="訂單列表" tabindex="0">
      <table class="orders-table">
        <thead><tr><th scope="col">訂單編號</th><th scope="col">會員</th><th scope="col">訂購日期</th><th scope="col">訂單狀態</th><th scope="col" class="amount-column">訂單金額</th><th scope="col"><span class="visually-hidden">操作</span></th></tr></thead>
        <tbody>
          @for(o of orders();track o.id){
            <tr>
              <td class="order-number">{{o.orderNo}}</td>
              <td><div class="order-customer"><strong>{{o.customerName}}</strong><small>{{o.customerNo}}</small></div></td>
              <td class="order-date">{{o.orderedAt | date:'yyyy/MM/dd HH:mm'}}</td>
              <td><span class="order-badge" [class.order-badge--review]="o.stat === '20'" [class.order-badge--paid]="o.stat === 'DD' || o.stat === '40'" [class.order-badge--cancelled]="o.stat === 'ZZ'">{{statusName(o.stat)}}</span></td>
              <td class="amount-column order-amount">{{o.total | currency:'TWD':'NT$'}}</td>
              <td class="order-action"><button class="order-detail-button" type="button" (click)="openOrder(o.id, orderDialog)" [attr.aria-label]="'查看訂單 ' + o.orderNo + ' 明細'">查看明細 <span aria-hidden="true">→</span></button> @if(!o.isPaid && (!o.stat || o.stat === '10' || o.stat === 'ZZ')){<button class="order-detail-button" type="button" [disabled]="busy()" (click)="deleteOrder(o.id, o.orderNo)" [attr.aria-label]="'刪除訂單 ' + o.orderNo">刪除</button>}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  } @else { <p class="order-list-empty">目前沒有訂單。</p> }
</section>
<!-- 2026-11-27：訂單與售後資料改在對話框顯示，不再展開於列表下方。 -->
<dialog #orderDialog class="order-dialog" aria-labelledby="order-dialog-title" (close)="closeOrder()" (cancel)="busy() && $event.preventDefault()">
  <header class="order-dialog__header"><div><h2 id="order-dialog-title">訂單明細</h2></div><button type="button" class="order-dialog__close" [disabled]="busy()" (click)="orderDialog.close()" aria-label="關閉訂單明細">×</button></header>
  <div class="order-dialog__body">
    @if(message()){<p class="order-dialog__message" role="status">{{message()}}</p>}
    @if(detail();as d){
    <!-- 2026-11-27：訂單明細與黑貓託運單號使用頁籤切換。 -->
    <nav class="order-detail-tabs" aria-label="訂單明細頁籤"><button type="button" [class.active]="detailTab() === 'detail'" [attr.aria-current]="detailTab() === 'detail' ? 'page' : null" (click)="detailTab.set('detail')">訂單明細</button><button type="button" [class.active]="detailTab() === 'tracking'" [attr.aria-current]="detailTab() === 'tracking' ? 'page' : null" (click)="detailTab.set('tracking')">管理單號</button></nav>
    @if(detailTab() === 'detail'){
    <!-- 2026-11-27：左側分別顯示繳費與收件資料，右側顯示訂單資訊。 -->
    <div class="order-detail-layout">
      <div class="order-detail-left">
        <section class="admin-card order-info-card">
          <h3>繳費資料</h3>
          <dl class="order-fields">
            <div><dt>訂單狀態</dt><dd><span class="order-badge" [class.order-badge--review]="d.order.stat === '20'" [class.order-badge--paid]="d.order.stat === 'DD' || d.order.stat === '30' || d.order.stat === '40'" [class.order-badge--cancelled]="d.order.stat === 'ZZ'">{{statusName(d.order.stat)}}</span></dd></div>
            <!-- 2026-11-27：出貨後供管理員查詢託運單號。 -->
            @if(d.order.trackingNumber){<div><dt>託運單號</dt><dd><strong>{{d.order.trackingNumber}}</strong></dd></div>}
            <div><dt>轉帳後四碼</dt><dd><strong>{{d.order.transferLastFour || '尚未提交'}}</strong></dd></div>
            @if(d.order.transferReportedAt){<div><dt>提交時間</dt><dd>{{d.order.transferReportedAt | date:'yyyy/MM/dd HH:mm'}}</dd></div>}
          </dl>
        </section>
        <section class="admin-card order-info-card">
          <h3>收件人資訊</h3>
          <dl class="order-fields">
            <div><dt>收件姓名</dt><dd>{{d.order.recipientName}}</dd></div>
            <div><dt>聯絡電話</dt><dd>{{d.order.recipientPhone}}</dd></div>
            <div><dt>收件地址</dt><dd>{{d.order.shippingAddress}}</dd></div>
          </dl>
        </section>
        <!-- 2026-11-27：操作按鈕移到左側下方，與區塊邊線對齊。 -->
          <div class="order-detail-actions">
            @if((d.order.stat === '10' || d.order.stat === '20') && !d.order.isPaid){<button type="button" class="admin-primary-btn" [disabled]="busy()" (click)="confirmPayment(d.order.id)">完成繳費</button>}
            @if(d.order.stat === '20' && !d.order.isPaid){<button type="button" class="admin-secondary-btn" [disabled]="busy()" (click)="rejectTransfer(d.order.id)">繳費失敗</button>}
            @if(d.order.stat === '30'){<button type="button" class="admin-primary-btn" [disabled]="busy()" (click)="completeOrder(d.order.id)">完成訂單</button>}
            @if(d.order.stat === '10' && !d.order.isPaid){<button type="button" class="admin-secondary-btn" [disabled]="busy()" (click)="cancel(d.order.id)">取消訂單</button>}
          </div>
      </div>
      <section class="admin-card order-info-card order-info-main" tabindex="0" aria-label="訂單資訊，可捲動">
        <h3>訂單資訊</h3>
        <dl class="order-fields">
          <div><dt>訂單編號</dt><dd><strong>{{d.order.orderNo}}</strong></dd></div>
          <div><dt>會員</dt><dd>{{d.order.customerName}} · {{d.order.customerNo}}</dd></div>
          <div><dt>訂購時間</dt><dd>{{d.order.orderedAt | date:'yyyy/MM/dd HH:mm'}}</dd></div>
        </dl>
        <h4>商品明細</h4>
        <div class="order-products">
          @for(i of d.items;track i.id){<div class="order-product"><div><strong>{{i.productName}}</strong><small>{{i.skuName}} × {{i.quantity}}</small>@if(i.taxName){<small>{{i.taxName}} {{i.taxRate}}% · {{i.priceIncludesTax?'含稅':'未稅加計'}} · 稅額 {{i.taxAmount | currency:'TWD':'NT$'}}</small>}</div><strong>{{i.amount | currency:'TWD':'NT$'}}</strong></div>}
        </div>
        <dl class="order-amounts">
          <div><dt>商品小計</dt><dd>{{d.order.subtotal | currency:'TWD':'NT$'}}</dd></div>
          <div><dt>稅額合計 <small>（含售價內稅額）</small></dt><dd>{{d.order.taxAmount | currency:'TWD':'NT$'}}</dd></div>
          <div><dt>{{d.order.shippingMethodName || '配送'}}運費</dt><dd>{{d.order.shipping | currency:'TWD':'NT$'}}</dd></div>
          <div><dt>折扣</dt><dd>{{d.order.discount | currency:'TWD':'NT$'}}</dd></div>
          <div class="order-amounts__total"><dt>訂單總額</dt><dd>{{d.order.total | currency:'TWD':'NT$'}}</dd></div>
        </dl>
      </section>
    </div>
@if(d.order.isPaid && d.order.stat !== 'ZZ'){<section class="admin-card editor-card"><h2>新增售後／退款紀錄</h2><p>退款需由管理員實際處理；此處僅記錄，不會自動轉帳。</p><form (ngSubmit)="createAfterSale(d.order.id)"><label>原因<textarea name="reason" [(ngModel)]="afterReason" maxlength="2000" required></textarea></label><label>預計退款金額（可為 0）<input name="amount" type="number" min="0" step="0.01" [(ngModel)]="refundAmount" required /></label>@for(i of d.items;track i.id){<label>{{i.productName}} · {{i.skuName}}　售後實際數量（最多 {{i.quantity * i.unitsPerSale}}）<input type="number" min="0" [max]="i.quantity * i.unitsPerSale" step="1" [name]="'q'+i.id" [(ngModel)]="returnQuantities[i.id]" /></label>}<button class="admin-primary-btn" [disabled]="busy() || !afterReason.trim()">建立售後紀錄</button></form></section>}
<section class="admin-card editor-card"><h2>售後紀錄</h2>@for(a of cases();track a.id){<div class="after-case"><p><b>{{caseLabel(a.status)}}</b> · {{a.reason}} · 退款 {{a.refundAmount | currency:'TWD':'NT$'}}</p><small>建立：{{a.createdBy}} {{a.createdAt | date:'yyyy/MM/dd HH:mm'}} @if(a.receivedAt){ · 收貨：{{a.receivedBy}} {{a.receivedAt | date:'yyyy/MM/dd HH:mm'}}} @if(a.refundedAt){ · 退款確認：{{a.refundedBy}} {{a.refundedAt | date:'yyyy/MM/dd HH:mm'}}}</small>@for(i of a.items;track i.id){<p>{{i.productName}} · {{i.skuName}} × {{i.quantity}} · {{i.restockedAt ? '已回補庫存' : '尚未回補'}} @if(d.order.stat !== 'ZZ' && !i.restockedAt && (a.status === 'RECEIVED' || a.status === 'REFUNDED')){<button type="button" [disabled]="busy()" (click)="restock(a.id,i.id,d.order.id)">回補庫存</button>}</p>}@if(a.status === 'OPEN' && a.items.length){<button type="button" [disabled]="busy()" (click)="caseStatus(a.id,'RECEIVED',d.order.id)">確認收到退貨</button>}@if(a.status === 'RECEIVED' || (a.status === 'OPEN' && !a.items.length)){<button type="button" [disabled]="busy()" (click)="caseStatus(a.id,'REFUNDED',d.order.id)">確認已人工退款</button>}@if(a.status !== 'CLOSED'){<button type="button" [disabled]="busy()" (click)="caseStatus(a.id,'CLOSED',d.order.id)">結案</button>}</div>}@empty{<p>尚無售後紀錄。</p>}</section>}
    @else {
      <section class="admin-card tracking-panel">
        <h3>黑貓託運單號</h3>
        <p>請在包裹交給黑貓後輸入單號並確認出貨。</p>
        @if(d.order.stat === 'DD' || d.order.stat === '30') {
          <form (ngSubmit)="saveShipment(d.order.id)" #shipmentForm="ngForm">
            <!-- 2026-11-27：將託運單號範例放入輸入框，移除下方提示。 -->
            <label for="trackingNumber">託運單號</label>
            <input id="trackingNumber" name="trackingNumber" [(ngModel)]="trackingNumber" type="text" inputmode="numeric" maxlength="20" required placeholder="範例 : 1350-7921-3444" />
            @if(d.order.shippedAt){<p>首次出貨時間：{{d.order.shippedAt | date:'yyyy/MM/dd HH:mm'}}</p>}
            <button type="submit" class="admin-primary-btn" [disabled]="busy() || shipmentForm.invalid">{{d.order.stat === '30' ? '儲存單號' : '確認出貨'}}</button>
          </form>
        } @else if(d.order.stat === '40') { <p>訂單已完成，託運單號：{{d.order.trackingNumber || '未提供'}}。</p> } @else { <p>請先確認收到款項，才能登記託運單號及出貨。</p> }
      </section>
    }
}
    @if(!detail() && !message()){<p role="status">讀取訂單資料中…</p>}
  </div>
  <footer class="order-dialog__footer"><button type="button" class="admin-secondary-btn" [disabled]="busy()" (click)="orderDialog.close()">關閉</button></footer>
</dialog>
<!-- 2026-11-27：訂單及售後操作統一使用網站內確認視窗。 -->
<dialog #actionDialog class="action-dialog" aria-labelledby="action-dialog-title" aria-describedby="action-dialog-message">
  <h2 id="action-dialog-title">請確認操作</h2><p id="action-dialog-message">{{confirmationText()}}</p>
  <div class="action-dialog__buttons"><button type="button" class="admin-secondary-btn" (click)="actionDialog.close('cancel')">返回</button><button type="button" class="admin-primary-btn" (click)="actionDialog.close('confirm')">確認</button></div>
</dialog>
`, styleUrl: '../../css/admin/admin-orders.page.scss'
})

export class AdminOrdersPageComponent {
    // 2026-11-27：後台列表及明細顯示 stat 對應的付款狀態。
    readonly statusName = orderStatusName;
    private service = inject(OrderService); orders = signal<OrderSummary[]>([]); stats = signal<OrderStats | null>(null); detail = signal<OrderDetail | null>(null); cases = signal<AfterSale[]>([]); message = signal(''); busy = signal(false); afterReason = ''; refundAmount = 0; returnQuantities: Record<number, number> = {};
    // 2026-11-27：開啟明細對話框並防止關閉後的舊請求覆蓋資料。
    // 2026-11-27：用網站內對話框替代瀏覽器確認視窗。
    @ViewChild('orderDialog') private orderDialog!: ElementRef<HTMLDialogElement>;
    readonly detailTab = signal<'detail' | 'tracking'>('detail');
    trackingNumber = '';
    @ViewChild('actionDialog') private actionDialog!: ElementRef<HTMLDialogElement>;
    readonly confirmationText = signal('');
    private askConfirm(message: string): Promise<boolean> { const dialog = this.actionDialog.nativeElement; this.confirmationText.set(message); return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.returnValue = ''; dialog.showModal(); }); }
    private detailGeneration = 0;
    openOrder(id: number, dialog: HTMLDialogElement) { this.detailTab.set('detail'); this.trackingNumber = ''; this.detail.set(null); this.cases.set([]); this.message.set(''); dialog.showModal(); void this.show(id); }
    closeOrder() { this.detailGeneration++; this.detail.set(null); this.cases.set([]); this.message.set(''); }
    constructor() { void this.load(); } async load() { try { const [orders, stats] = await Promise.all([this.service.admin(), this.service.stats()]); this.orders.set(orders); this.stats.set(stats); } catch { this.message.set('訂單讀取失敗。'); } }
    async show(id: number) { const generation = ++this.detailGeneration; try { const [detail, cases] = await Promise.all([this.service.detail(id), this.service.afterSales(id)]); if (generation !== this.detailGeneration) return; if (this.detail()?.order.id !== id) { this.returnQuantities = {}; this.afterReason = ''; this.refundAmount = 0; } this.detail.set(detail); this.trackingNumber = detail.order.trackingNumber ?? ''; this.cases.set(cases); } catch { if (generation === this.detailGeneration) this.message.set('訂單明細或售後紀錄讀取失敗。'); } }
    async confirmPayment(id: number) { if (!await this.askConfirm('請先確認已實際收到全額款項。確認後系統將扣除訂購商品庫存。')) return; this.busy.set(true); try { await this.service.confirmPayment(id); /* 2026-11-27：付款成功後立即鎖定取消，避免重新讀取失敗時顯示舊按鈕。 */ this.detail.update(current => current && current.order.id === id ? { ...current, order: { ...current.order, stat: 'DD', isPaid: true } } : current); this.orderDialog.nativeElement.close(); await this.load(); this.message.set('已記錄人工付款確認。'); } catch (e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    // 2026-11-27：管理員確認包裹已送達後完成訂單。
    async completeOrder(id: number) { if (!await this.askConfirm('請確認包裹已送達收件人，確認後訂單將標記為已完成。')) return; this.busy.set(true); try { await this.service.complete(id); this.message.set('訂單已完成。'); await Promise.all([this.load(), this.show(id)]); } catch(e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    // 2026-11-27：儲存單號並確認出貨；失敗時保留輸入與現有狀態。
    async saveShipment(id: number) { if (!/^[0-9 -]+$/.test(this.trackingNumber) || ![10, 12].includes(this.trackingNumber.replace(/[ -]/g, '').length)) { this.message.set('請輸入 10 碼或 12 碼數字的託運單號。'); return; } if (!await this.askConfirm('請確認包裹已交給黑貓，儲存後訂單狀態將顯示為已出貨。')) return; this.busy.set(true); try { await this.service.recordShipment(id, this.trackingNumber); this.message.set('託運單號已儲存，訂單已標記出貨。'); await Promise.all([this.load(), this.show(id)]); } catch(e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    // 2026-11-27：核對失敗時退回待付款，由顧客重新提交資料。
    async rejectTransfer(id: number) { if (!await this.askConfirm('確認尚未核對到款項？訂單將退回待付款，顧客可重新提交資料。')) return; this.busy.set(true); try { await this.service.rejectTransfer(id); this.message.set('已退回待付款，原轉帳資料保留供核對。'); await Promise.all([this.load(), this.show(id)]); } catch (e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    // 2026-11-27：已付款訂單不能使用一般取消流程。
    async cancel(id: number) { if (!await this.askConfirm('確認取消此未付款訂單？')) return; this.busy.set(true); try { await this.service.cancel(id); this.message.set('訂單已取消。'); await Promise.all([this.load(), this.show(id)]); } catch { this.message.set('取消失敗，請重新整理並核對訂單狀態。'); } finally { this.busy.set(false); } }
    // 2026-11-27：刪除前顯示訂單編號並要求確認，成功後更新列表及統計。
    async deleteOrder(id: number, orderNo: string) { if (!await this.askConfirm(`確定永久刪除訂單 ${orderNo} 及其商品明細？刪除後無法復原，顧客也將無法查看此訂單。`)) return; this.busy.set(true); try { await this.service.deleteOrder(id); this.orders.update(orders => orders.filter(order => order.id !== id)); try { const [orders, stats] = await Promise.all([this.service.admin(), this.service.stats()]); this.orders.set(orders); this.stats.set(stats); this.message.set('訂單已刪除。'); } catch { this.message.set('訂單已刪除，但列表或統計更新失敗，請重新整理。'); } } catch (e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    caseLabel(status: string) { return ({ OPEN: '待處理', RECEIVED: '已收貨', REFUNDED: '已人工退款', CLOSED: '已結案' } as Record<string, string>)[status] ?? status; }
    async createAfterSale(orderId: number) { const items = Object.entries(this.returnQuantities).filter(([, qty]) => qty > 0).map(([id, quantity]) => ({ orderItemId: Number(id), quantity })); this.busy.set(true); try { await this.service.createAfterSale(orderId, this.afterReason, this.refundAmount, items); this.afterReason = ''; this.refundAmount = 0; this.returnQuantities = {}; this.message.set('已建立售後紀錄。'); await this.show(orderId); } catch (e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    async caseStatus(id: number, status: string, orderId: number) { const text = status === 'REFUNDED' ? '請確認已實際完成退款；系統不會自動轉帳。' : status === 'RECEIVED' ? '確認已收到退貨？' : '確定結案？結案後不能再回補庫存。'; if (!await this.askConfirm(text)) return; this.busy.set(true); try { await this.service.afterSaleStatus(id, status); this.message.set('售後狀態已更新。'); await this.show(orderId); } catch (e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    async restock(id: number, itemId: number, orderId: number) { if (!await this.askConfirm('確認已檢查退回商品，並將數量回補庫存？')) return; this.busy.set(true); try { await this.service.restockAfterSale(id, itemId); this.message.set('庫存已回補。'); await this.show(orderId); } catch (e) { this.message.set(this.errorText(e)); } finally { this.busy.set(false); } }
    private errorText(e: unknown) { return (e as { error?: { message?: string } })?.error?.message ?? '操作失敗，請重新整理後再試。'; }
}
