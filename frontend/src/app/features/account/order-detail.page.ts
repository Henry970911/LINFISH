import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `<section class="section"><div class="container narrow-page"><a class="text-link" routerLink="/account/orders">← 返回訂單紀錄</a><div class="order-detail-head"><div><span class="eyebrow">ORDER DETAIL</span><h1>訂單 {{ orderId }}</h1><p>建立日期：2026/11/18 14:32</p></div><span class="status status--processing">處理中</span></div><div class="order-detail-grid"><main><section class="account-panel"><h2>商品明細</h2><div class="detail-line"><span class="mock-thumb">🐠</span><p><b>黃金檸檬琴尾茉莉</b><small>數量 2</small></p><strong>{{ 360 | currency:'TWD':'NT$':'1.0-0' }}</strong></div><div class="detail-line"><span class="mock-thumb mock-thumb--green">🌿</span><p><b>迷你小榕沉木組</b><small>數量 1</small></p><strong>{{ 260 | currency:'TWD':'NT$':'1.0-0' }}</strong></div></section><section class="account-panel"><h2>訂單進度</h2><div class="timeline"><div class="done"><i>✓</i><p><b>訂單成立</b><small>2026/11/18 14:32</small></p></div><div class="done"><i>✓</i><p><b>商品狀態確認中</b><small>客服將於營業時間與你聯繫</small></p></div><div><i></i><p><b>準備出貨</b><small>尚未完成</small></p></div></div></section></main><aside><section class="account-panel"><h2>金額明細</h2><div class="summary-line"><span>商品小計</span><b>NT$620</b></div><div class="summary-line"><span>運費</span><b>NT$120</b></div><div class="summary-line total"><span>訂單總額</span><b>NT$740</b></div></section><section class="account-panel"><h2>收件資料</h2><p>林小姐<br />0912 345 678<br />台北市中山區水族路 18 號 3 樓</p></section></aside></div></div></section>`,
})
export class OrderDetailPageComponent {
  readonly orderId = inject(ActivatedRoute).snapshot.paramMap.get('id');
}

