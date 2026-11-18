import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../core/models/store.models';
import { StoreService } from '../../core/services/store.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CurrencyPipe, ProductCardComponent, RouterLink],
  template: `
    @if (product(); as item) {
      <div class="container breadcrumb"><a routerLink="/">首頁</a><span>/</span><a routerLink="/catalog">所有商品</a><span>/</span><b>{{ item.name }}</b></div>
      <section class="container product-detail">
        <div class="product-gallery">
          <div class="product-gallery__main" [style.background]="item.gradient"><span class="detail-emoji">{{ item.emoji }}</span><small>商品示意圖 · 後台可上傳多張照片</small></div>
          <div class="thumbnail-row"><button class="active" [style.background]="item.gradient">{{ item.emoji }}</button><button [style.background]="item.gradient">◌</button><button [style.background]="item.gradient">≈</button></div>
        </div>
        <div class="product-info">
          <span class="product-info__category">{{ categoryName(item.categorySlug) }} · 庫存 {{ item.stock > 10 ? '充足' : '僅剩 ' + item.stock }}</span>
          <h1>{{ item.name }}</h1>@if (item.scientificName) { <p class="latin">{{ item.scientificName }}</p> }
          <p class="product-lead">{{ item.description }}</p>
          <div class="care-grid"><div><small>照護難度</small><b>{{ item.careLevel }}</b></div><div><small>目前尺寸</small><b>{{ item.size }}</b></div><div><small>建議水溫</small><b>{{ item.temperature }}</b></div></div>
          @if (store.isMember()) {
            <div class="detail-price"><small>會員售價</small><strong>{{ item.price | currency:'TWD':'NT$':'1.0-0' }}</strong>@if (item.compareAtPrice) { <del>{{ item.compareAtPrice | currency:'TWD':'NT$':'1.0-0' }}</del> }</div>
            <div class="purchase-row"><div class="quantity"><button type="button" (click)="decreaseQuantity()">−</button><span>{{ quantity() }}</span><button type="button" (click)="quantity.update((value) => value + 1)">＋</button></div><button class="btn btn--coral btn--grow" type="button" (click)="add(item)">加入購物車</button></div>
          } @else {
            <div class="member-gate"><div><span>MEMBERS ONLY</span><h3>會員登入後即可查看價格</h3><p>免費註冊，同步享有到貨照護提醒與訂單紀錄。</p></div><a class="btn btn--dark" routerLink="/login">登入／免費註冊</a></div>
          }
          <div class="delivery-note"><span>🚚</span><p><b>活體商品固定每週三、六出貨</b><br />下單後客服將依氣候與地區確認適合的寄送日期。</p></div>
        </div>
      </section>
      <section class="product-description"><div class="container description-grid"><article><span class="eyebrow">CARE NOTES</span><h2>帶回家之前，你需要知道</h2><p>{{ item.description }} 建議新魚到家後先進行對溫與緩慢對水，並留意前 24 小時活動與呼吸狀況。</p><h3>混養建議</h3><p>請選擇性情與體型相近的魚種，避免與具攻擊性或嘴型差距過大的魚隻混養。實際狀況仍會依個體與缸體配置不同。</p></article><aside><h3>基本照護清單</h3><ul><li><span>01</span>穩定完成養水的魚缸</li><li><span>02</span>與袋內溫差不超過 2°C</li><li><span>03</span>入缸首日減少餵食與照明</li><li><span>04</span>持續觀察活動與進食狀態</li></ul></aside></div></section>
      <section class="section"><div class="container"><div class="section-heading"><div><span class="eyebrow">YOU MAY ALSO LIKE</span><h2>一起看看這些</h2></div></div><div class="product-grid">@for (related of store.featuredProducts().slice(0, 4); track related.id) { <app-product-card [product]="related" /> }</div></div></section>
    } @else { <div class="empty-state page-empty"><span>404</span><h2>找不到這項商品</h2><a class="btn btn--dark" routerLink="/catalog">回到商品列表</a></div> }
  `,
})
export class ProductDetailPageComponent {
  readonly store = inject(StoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly product = signal<Product | undefined>(undefined);
  readonly quantity = signal(1);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.product.set(this.store.productBySlug(params.get('slug'))));
  }

  categoryName(slug: string): string {
    return this.store.categories().find((item) => item.slug === slug)?.name ?? '精選商品';
  }

  add(product: Product): void {
    this.store.addToCart(product, this.quantity());
  }

  decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }
}

