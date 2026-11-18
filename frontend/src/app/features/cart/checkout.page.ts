import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <section class="page-hero page-hero--compact"><div class="container"><div><span class="eyebrow">CHECKOUT</span><h1>填寫訂單資料</h1></div><div class="checkout-steps"><b>1 購物車</b><span></span><b class="active">2 填寫資料</b><span></span><b>3 完成訂單</b></div></div></section>
    <section class="section section--cart"><form class="container checkout-layout" (ngSubmit)="submit()"><div class="checkout-form">
      <section class="form-section"><div class="form-section__title"><span>01</span><div><h2>聯絡人資料</h2><p>用於訂單與出貨聯繫</p></div></div><div class="form-grid"><label>姓名<input name="name" [(ngModel)]="form.name" required placeholder="請輸入真實姓名" /></label><label>手機<input name="phone" [(ngModel)]="form.phone" required placeholder="09xx xxx xxx" /></label><label class="full">Email<input name="email" [(ngModel)]="form.email" type="email" required placeholder="name@example.com" /></label></div></section>
      <section class="form-section"><div class="form-section__title"><span>02</span><div><h2>配送方式</h2><p>活體與一般商品將依規則分批配送</p></div></div><label class="radio-card active"><input type="radio" name="shipping" checked /><span>🚚</span><div><b>宅配到府</b><small>出貨前將由客服確認適合日期</small></div><strong>NT$120</strong></label><div class="form-grid address-grid"><label>縣市<select name="city" [(ngModel)]="form.city"><option>台北市</option><option>新北市</option><option>桃園市</option><option>台中市</option><option>高雄市</option></select></label><label>行政區<input name="district" [(ngModel)]="form.district" placeholder="請輸入行政區" /></label><label class="full">詳細地址<input name="address" [(ngModel)]="form.address" required placeholder="路名、巷弄、門牌、樓層" /></label></div></section>
      <section class="form-section"><div class="form-section__title"><span>03</span><div><h2>付款方式</h2><p>正式串接金流前的畫面預留</p></div></div><label class="radio-card active"><input type="radio" name="payment" checked /><span>▣</span><div><b>ATM 虛擬帳號</b><small>訂單成立後顯示付款資訊</small></div></label><label class="radio-card"><input type="radio" name="payment" /><span>◇</span><div><b>線上信用卡</b><small>金流串接後啟用</small></div><em>COMING SOON</em></label></section>
    </div><aside class="order-summary checkout-summary"><span class="eyebrow">YOUR ORDER</span><h2>你的訂單</h2>@for (item of store.cart(); track item.product.id) { <div class="mini-item"><span [style.background]="item.product.gradient">{{ item.product.emoji }}</span><p><b>{{ item.product.name }}</b><small>數量 {{ item.quantity }}</small></p><strong>{{ item.product.price * item.quantity | currency:'TWD':'NT$':'1.0-0' }}</strong></div> }<hr /><div><span>商品小計</span><b>{{ store.cartSubtotal() | currency:'TWD':'NT$':'1.0-0' }}</b></div><div><span>運費</span><b>{{ store.shippingFee() | currency:'TWD':'NT$':'1.0-0' }}</b></div><div class="summary-total"><span>應付總額</span><strong>{{ store.cartTotal() | currency:'TWD':'NT$':'1.0-0' }}</strong></div><label class="terms"><input type="checkbox" required />我已閱讀並同意購物須知與到貨規範</label><button class="btn btn--coral btn--block" type="submit">確認送出訂單</button><a class="back-link" routerLink="/cart">← 返回購物車</a></aside></form></section>
  `,
})
export class CheckoutPageComponent {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  form = { name: '', phone: '', email: '', city: '台北市', district: '', address: '' };

  submit(): void {
    this.store.clearCart();
    this.router.navigate(['/order-complete']);
  }
}

