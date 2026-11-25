import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDetail, OrderService } from '../../core/services/order.service';
import { orderStatusName } from './order-status';

@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
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
            <span class="status-badge" [class.is-cancelled]="d.order.status === 'CANCELLED'">{{
              statusName(d.order.status)
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
                    <strong>目前狀態：{{ statusName(d.order.status) }}</strong
                    ><small>{{ d.order.isPaid ? '已付款' : '尚未付款' }}</small>
                  </div>
                </div>
                <!-- 物流追蹤尚未串接，保留位置且不推測運送進度。 -->
                <div class="progress-entry">
                  <span class="progress-dot"></span>
                  <div><strong>運送進度</strong><small>物流追蹤資訊尚未提供</small></div>
                </div>
              </section>
              @if (
                !d.order.isPaid && (d.order.status === 'PENDING' || d.order.status === 'PROCESSING')
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
                <p>
                  {{ d.order.recipientName }}<br />{{ d.order.recipientPhone }}<br />{{
                    d.order.shippingAddress
                  }}
                </p>
              </section>
            </aside>
          </div>
        } @else {
          <p role="status">{{ message() }}</p>
        }
      </div>
    </section>
  `,
  styleUrl: '../../css/account/order-detail.page.scss',
})
export class OrderDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OrderService);
  readonly statusName = orderStatusName;
  readonly detail = signal<OrderDetail | null>(null);
  readonly message = signal('讀取中…');
  readonly busy = signal(false);

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

  // 沿用後端的取消規則：只有未付款且尚未出貨的訂單可由會員取消。
  async cancel(id: number): Promise<void> {
    if (!confirm('確定取消這筆未付款訂單？')) return;
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
