import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-complete-page',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="completion-page"><div class="completion-mark">✓</div><span class="eyebrow">ORDER RECEIVED</span><h1>謝謝你，訂單已經收到。</h1><p>訂單編號 <b>LF20261118008</b>。我們會先確認商品狀態與適合的出貨日期，再以 Email 或 LINE 與你聯繫。</p><div class="completion-steps"><div><span>01</span><b>確認訂單</b><small>系統已建立訂單</small></div><div><span>02</span><b>客服聯繫</b><small>確認商品與出貨日</small></div><div><span>03</span><b>安心收貨</b><small>依指引完成對水</small></div></div><div><a class="btn btn--dark" routerLink="/account/orders">查看我的訂單</a><a class="text-link" routerLink="/">回到首頁 →</a></div></section>`,
})
export class OrderCompletePageComponent {}

