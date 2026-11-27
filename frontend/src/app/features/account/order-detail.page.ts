import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderDetail, OrderService } from '../../core/services/order.service';
import { orderStatusName } from './order-status';

// 2026-11-27：轉帳資料提交後顯示核對中，並允許更正後四碼。
@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <section class="section order-detail-page">
      <div class="container narrow-page">
        <a class="back-link" routerLink="/account/orders">← 返回訂單紀錄</a>
        @if (detail(); as d) {
          <header class="detail-heading">
            <div>
              <span class="eyebrow">ORDER DETAIL</span>
              <h1>訂單 {{ d.order.orderNo }}</h1>
              <p>建立日期：{{ d.order.orderedAt | date: 'yyyy/MM/dd HH:mm' }}</p>
            </div>
            <span class="status-badge" [class.is-cancelled]="d.order.stat === 'ZZ'">{{
              statusName(d.order.stat)
            }}</span>
          </header>
          <div class="detail-grid">
            <div class="detail-main">
              <section class="account-panel detail-card">
                <h2>商品明細</h2>
                @for (item of d.items; track item.id) {
                  <div class="order-item">
                    <div class="item-icon" aria-hidden="true">▧</div>
                    <div class="item-description">
                      <strong>{{ item.productName }}</strong
                      ><small>{{ item.skuName }} · 數量 {{ item.quantity }}</small>
                      @if (item.taxName) {
                        <small
                          >{{ item.taxName }} ·
                          {{ item.priceIncludesTax ? '含稅' : '未稅加計' }}</small
                        >
                      }
                    </div>
                    <strong>{{ item.amount | currency: 'TWD' : 'NT$' }}</strong>
                  </div>
                } @empty {
                  <p>沒有商品明細。</p>
                }
              </section>
              @if ((d.order.stat === '10' || d.order.stat === '20') && !d.order.isPaid) {
                <section class="account-panel detail-card transfer-panel">
                  <!-- 2026-11-27：付款標題與右側 QR Code 頂部對齊。 -->
                  <div class="transfer-layout">
                    <div class="transfer-info">
                      <h2>銀行轉帳付款</h2>
                      <p class="transfer-amount">請轉帳 <strong>{{ d.order.total | currency: 'TWD' : 'NT$' }}</strong></p>
                      <!-- 2026-11-27：統一付款資訊稱呼及間距。 -->
                      <p>中國信託（822）<br />帳號：034540647436<br />負責人：林先生</p>
                      <p>訂單編號：<strong>{{ d.order.orderNo }}</strong></p>
                      @if (d.order.stat === '10' && d.order.transferLastFour) {
                        <p>轉帳資料核對未通過，請確認後四碼並重新提交；若已轉帳，請勿重複轉帳，可聯絡管理員協助。</p>
                      } @else if (d.order.transferLastFour) {
                        <p>已提交轉出帳號後四碼：<strong>{{ d.order.transferLastFour }}</strong>，等待管理員核對入帳。</p>
                      }
                      <form (ngSubmit)="paymentDialog.showModal()" #transferForm="ngForm">
                        <label for="lastFour">轉出帳號後四碼</label>
                        <!-- 2026-11-27：保留後四碼驗證，移除輸入框下方提示文字。 -->
                        <input id="lastFour" name="lastFour" [(ngModel)]="lastFour" #lastFourField="ngModel" type="text" inputmode="numeric" autocomplete="off" pattern="[0-9]{4}" maxlength="4" required placeholder="範例：0024" [attr.aria-invalid]="lastFourField.invalid && (lastFourField.dirty || lastFourField.touched) ? 'true' : null" />
                        <button class="btn btn--coral" type="submit" [disabled]="busy() || transferForm.invalid">{{ d.order.transferLastFour ? '更新轉帳資料' : '完成轉帳－提交資料' }}</button>
                      </form>
                      <!-- 2026-11-27：分行顯示轉帳提醒，並提示顧客截圖保存紀錄。 -->
                      <p class="transfer-instructions">請掃描 QR Code 並輸入訂單金額，轉帳後提交帳號後四碼；<br /><strong>如有備註欄，可填入訂單編號。<br />管理員確認收款後會更新付款狀態。<br />轉帳後請截圖，以保留自己的權益。</strong></p>
                    </div>
                    <div class="transfer-image">
                      <img class="transfer-qr" src="/images/bank-transfer-qr.jpg" alt="中國信託轉帳 QR Code" />
                    </div>
                  </div>
                  <!-- 2026-11-27：沿用商品上架警告的網站內 dialog 樣式，提交前確認資料。 -->
                  <dialog #paymentDialog class="payment-dialog" aria-labelledby="payment-dialog-title" aria-describedby="payment-dialog-warning">
                    <h2 id="payment-dialog-title">確認提交繳費資料</h2>
                    <p>請確認您已完成轉帳，並核對以下訂單資料：</p>
                    <div class="payment-dialog__summary">
                      <p>訂單編號：<strong>{{ d.order.orderNo }}</strong></p>
                      @for (item of d.items; track item.id) {
                        <p>{{ item.productName }} · {{ item.skuName }} × {{ item.quantity }}</p>
                      }
                      <p>訂單繳費金額：<strong>{{ d.order.total | currency: 'TWD' : 'NT$' }}</strong></p>
                      <p>轉出帳號後四碼：<strong>{{ lastFour }}</strong></p>
                    </div>
                    <p id="payment-dialog-warning" class="payment-dialog__warning">提交後將無法自行取消訂單，訂單後續將交由系統管理者進行資料核對。</p>
                    @if (paymentError()) { <p class="payment-dialog__error" role="alert">{{ paymentError() }}</p> }
                    <div class="payment-dialog__actions">
                      <button class="btn btn--dark" type="button" [disabled]="busy()" (click)="paymentDialog.close()">返回修改</button>
                      <button class="btn btn--coral" type="button" [disabled]="busy()" (click)="reportTransfer(d.order.id, paymentDialog)">{{ busy() ? '提交中…' : '確認提交' }}</button>
                    </div>
                  </dialog>
                </section>
              }
              <section class="account-panel detail-card progress-card">
                <h2>訂單進度</h2>
                <div class="progress-entry">
                  <span class="progress-dot complete">✓</span>
                  <div>
                    <strong>訂單成立</strong
                    ><small>{{ d.order.orderedAt | date: 'yyyy/MM/dd HH:mm' }}</small>
                  </div>
                </div>
                <div class="progress-entry">
                  <span class="progress-dot complete">✓</span>
                  <div>
                    <strong>目前狀態：{{ statusName(d.order.stat) }}</strong>
                  </div>
                </div>
                <!-- 2026-11-27：顯示管理員手動確認的託運單號與出貨時間。 -->
                <div class="progress-entry">
                  <span class="progress-dot" [class.complete]="(d.order.stat === '30' || d.order.stat === '40')">{{ (d.order.stat === '30' || d.order.stat === '40') ? '✓' : '' }}</span>
                  <div><strong>運送進度</strong>
                    @if((d.order.stat === '30' || d.order.stat === '40') && d.order.trackingNumber){<small>已出貨：{{ d.order.shippedAt | date: 'yyyy/MM/dd HH:mm' }}</small><small>黑貓託運單號：{{ d.order.trackingNumber }}</small><a href="https://www.t-cat.com.tw/inquire/trace.aspx" target="_blank" rel="noopener noreferrer">前往黑貓官網查詢 →</a>}
                    @else {<small>尚未確認出貨</small>}
                  </div>
                </div>
              </section>
              <!-- 2026-11-27：顧客收到商品後可確認完成訂單。 -->
              @if (d.order.stat === '30') {
                <button class="btn btn--coral" type="button" [disabled]="busy()" (click)="completeDialog.showModal()">完成訂單</button>
              }
              <!-- 2026-11-27：付款確認後不提供一般取消。 -->
              @if (
                d.order.stat === '10' && !d.order.isPaid && !d.order.transferReportedAt
              ) {
                <button
                  class="btn btn--dark"
                  type="button"
                  [disabled]="busy()"
                  (click)="cancel(d.order.id)"
                >
                  取消訂單
                </button>
              } @else if (d.order.isPaid) {
                <p>訂單已付款，如需售後協助請聯絡管理員。</p>
              }
              <p role="status">{{ message() }}</p>
            </div>
            <aside class="detail-side">
              <section class="account-panel detail-card">
                <h2>金額明細</h2>
                <dl class="amount-list">
                  <div>
                    <dt>商品小計</dt>
                    <dd>{{ d.order.subtotal | currency: 'TWD' : 'NT$' }}</dd>
                  </div>
                  <div>
                    <dt>稅額合計 <small>(含已包含於售價的稅額)</small></dt>
                    <dd>{{ d.order.taxAmount | currency: 'TWD' : 'NT$' }}</dd>
                  </div>
                  <div>
                    <dt>{{ d.order.shippingMethodName || '配送' }}運費</dt>
                    <dd>{{ d.order.shipping | currency: 'TWD' : 'NT$' }}</dd>
                  </div>
                  <div>
                    <dt>折扣</dt>
                    <dd>{{ d.order.discount | currency: 'TWD' : 'NT$' }}</dd>
                  </div>
                  <div class="amount-total">
                    <dt>訂單總額</dt>
                    <dd>{{ d.order.total | currency: 'TWD' : 'NT$' }}</dd>
                  </div>
                </dl>
              </section>
              <section class="account-panel detail-card">
                <h2>收件資料</h2>
                <!-- 2026-11-27：增加收件資料欄位名稱並統一排列。 -->
                <dl class="recipient-details">
                  <div><dt>收件姓名：</dt><dd>{{ d.order.recipientName }}</dd></div>
                  <div><dt>連絡電話：</dt><dd>{{ d.order.recipientPhone }}</dd></div>
                  <div><dt>收件地址：</dt><dd>{{ d.order.shippingAddress }}</dd></div>
                </dl>
              </section>
            </aside>
          </div>
        } @else {
          <p role="status">{{ message() }}</p>
        }
      </div>
    </section>
    <!-- 2026-11-27：確認收到商品後才完成訂單。 -->
    <dialog #completeDialog class="payment-dialog" aria-labelledby="complete-dialog-title">
      <h2 id="complete-dialog-title">確認完成訂單</h2><p>請確認您已收到商品，確認後訂單將標記為已完成。</p>
      <div class="payment-dialog__actions"><button type="button" class="btn btn--dark" [disabled]="busy()" (click)="completeDialog.close()">返回</button><button type="button" class="btn btn--coral" [disabled]="busy()" (click)="completeOrder(completeDialog)">確認完成</button></div>
    </dialog>
    <!-- 2026-11-27：取消訂單使用網站內確認視窗。 -->
    <dialog #cancelDialog class="payment-dialog" aria-labelledby="cancel-dialog-title">
      <h2 id="cancel-dialog-title">確認取消訂單</h2><p>確定取消這筆未付款訂單？</p>
      <form method="dialog" class="payment-dialog__actions"><button type="submit" value="cancel" class="btn btn--dark">返回</button><button type="submit" value="confirm" class="btn btn--coral">確認取消</button></form>
    </dialog>
  `,
  styleUrl: '../../css/account/order-detail.page.scss',
})
export class OrderDetailPageComponent {
  @ViewChild('cancelDialog') private cancelDialog!: ElementRef<HTMLDialogElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(OrderService);
  // 2026-11-27：付款狀態以 stat 顯示，舊訂單空值沿用原紀錄。
  readonly statusName = orderStatusName;
  readonly detail = signal<OrderDetail | null>(null);
  readonly message = signal('讀取中…');
  readonly busy = signal(false);
  readonly paymentError = signal('');
  lastFour = '';

  constructor() {
    void this.load(Number(this.route.snapshot.paramMap.get('id')));
  }

  async load(id: number): Promise<void> {
    try {
      this.detail.set(await this.service.detail(id));
      this.message.set('');
    } catch {
      this.message.set('找不到訂單或無權查看。');
    }
  }

  // 2026-11-27：使用網站內確認視窗，只有確認後才送出資料。
  async reportTransfer(id: number, dialog: HTMLDialogElement): Promise<void> {
    if (!/^[0-9]{4}$/.test(this.lastFour)) { this.message.set('請輸入四位數字。'); return; }
    this.paymentError.set('');
    this.busy.set(true);
    try {
      await this.service.reportTransfer(id, this.lastFour);
      dialog.close();
      this.lastFour = '';
      // 2026-11-27：提交轉帳資料成功後返回訂單紀錄。
      await this.router.navigate(['/account/orders']);
    } catch (error) {
      this.paymentError.set(error instanceof HttpErrorResponse && error.error?.message ? error.error.message : '提交失敗，請稍後再試。');
    } finally { this.busy.set(false); }
  }

  // 2026-11-27：顧客確認收貨後完成訂單，失敗時顯示伺服器訊息。
  async completeOrder(dialog: HTMLDialogElement): Promise<void> {
    const order = this.detail(); if (!order || this.busy()) return;
    this.busy.set(true);
    try { await this.service.complete(order.order.id); dialog.close(); await this.router.navigate(['/account/orders']); }
    catch (error) { dialog.close(); this.message.set(error instanceof HttpErrorResponse && error.error?.message ? error.error.message : '操作失敗，請重新整理後再試。'); }
    finally { this.busy.set(false); }
  }

  // 沿用後端的取消規則：只有未付款且尚未出貨的訂單可由會員取消。
  async cancel(id: number): Promise<void> {
    // 2026-11-27：取消前使用網站內彈窗確認。
    const dialog = this.cancelDialog.nativeElement;
    const confirmed = await new Promise<boolean>(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.returnValue = ''; dialog.showModal(); });
    if (!confirmed) return;
    this.busy.set(true);
    try {
      await this.service.cancel(id);
      await this.load(id);
      this.message.set('訂單已取消。');
    } catch (error) {
      this.message.set(
        error instanceof HttpErrorResponse && error.error?.message
          ? error.error.message
          : '取消失敗，請重新整理訂單。',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
