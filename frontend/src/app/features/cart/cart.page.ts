import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="page-hero page-hero--compact"><div class="container"><div><span class="eyebrow">YOUR SELECTION</span><h1>購物車</h1></div><div class="checkout-steps"><b class="active">1 購物車</b><span></span><b>2 填寫資料</b><span></span><b>3 完成訂單</b></div></div></section>
    <section class="section section--cart"><div class="container">
      @if (store.cart().length) {
        <div class="cart-layout"><div class="cart-list"><div class="cart-list__head"><span>商品資料</span><span>數量</span><span>小計</span></div>
          @for (item of store.cart(); track item.product.id) { <article class="cart-item"><a class="cart-item__visual" [routerLink]="['/product', item.product.slug]" [style.background]="item.product.gradient">{{ item.product.emoji }}</a><div class="cart-item__name"><small>{{ item.product.categorySlug }}</small><a [routerLink]="['/product', item.product.slug]">{{ item.product.name }}</a><b>{{ item.product.price | currency:'TWD':'NT$':'1.0-0' }}</b><button type="button" (click)="store.removeFromCart(item.product.id)">移除</button></div><div class="quantity"><button type="button" (click)="store.updateQuantity(item.product.id, item.quantity - 1)">−</button><span>{{ item.quantity }}</span><button type="button" (click)="store.updateQuantity(item.product.id, item.quantity + 1)">＋</button></div><strong>{{ item.product.price * item.quantity | currency:'TWD':'NT$':'1.0-0' }}</strong></article> }
          <a class="text-link" routerLink="/catalog">← 繼續選購</a></div>
          <aside class="order-summary"><span class="eyebrow">ORDER SUMMARY</span><h2>訂單摘要</h2><div><span>商品小計</span><b>{{ store.cartSubtotal() | currency:'TWD':'NT$':'1.0-0' }}</b></div><div><span>運費</span><b>{{ store.shippingFee() ? (store.shippingFee() | currency:'TWD':'NT$':'1.0-0') : '免運' }}</b></div><div class="free-shipping-note">@if (store.shippingFee()) { 再選購 {{ 1200 - store.cartSubtotal() | currency:'TWD':'NT$':'1.0-0' }} 即享常溫免運 } @else { 已達免運門檻 ✓ }</div><div class="summary-total"><span>合計</span><strong>{{ store.cartTotal() | currency:'TWD':'NT$':'1.0-0' }}</strong></div><a class="btn btn--coral btn--block" routerLink="/checkout">前往結帳</a><small class="secure-note">🔒 下一步填寫收件與付款資料</small></aside>
        </div>
      } @else { <div class="empty-state"><span>▱</span><h2>購物車還是空的</h2><p>去看看這週有哪些新朋友和實用器材。</p><a class="btn btn--dark" routerLink="/catalog">開始逛逛</a></div> }
    </div></section>
  `,
})
export class CartPageComponent {
  readonly store = inject(StoreService);
}

