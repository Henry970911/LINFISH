import { CurrencyPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/store.models';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  styleUrl: '../../css/shared/product-card.component.scss',
  template: `
    <article class="product-card">
      <a
        class="product-card__visual"
        [routerLink]="['/product', product.slug]"
        [style.background]="product.gradient"
      >
        @if (product.badge) {
          <span class="product-card__badge">{{ product.badge }}</span>
        }
        <button
          class="favorite"
          type="button"
          aria-label="收藏商品"
          (click)="$event.preventDefault()"
        >
          ♡
        </button>
        @if (product.image) { <img [src]="product.image" [alt]="product.name" class="product-card__image" /> } @else { <span class="product-emoji" aria-hidden="true">{{ product.emoji }}</span><span class="visual-caption">圖片待提供</span> }
      </a>
      <div class="product-card__body">
        <span class="product-card__meta">{{ categoryName }}</span>
        <a class="product-card__title" [routerLink]="['/product', product.slug]">{{
          product.name
        }}</a>
        @if (store.isMember()) {
          <div class="price-row">
            @if(product.skus?.length) { <strong>{{ product.price | currency: 'TWD' : 'NT$' : '1.0-0' }} 起</strong> } @else { <span>尚無可購買規格</span> }
            @if (product.compareAtPrice) {
              <del>{{ product.compareAtPrice | currency: 'TWD' : 'NT$' : '1.0-0' }}</del>
            }
          </div>
          <a class="add-cart" [routerLink]="['/product', product.slug]">選擇規格 <span>→</span></a>
        } @else {
          <a class="member-price" routerLink="/login">登入查看會員價 <span>→</span></a>
        }
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  readonly store = inject(StoreService);

  get categoryName(): string {
    return (
      this.store.categories().find((item) => item.slug === this.product.categorySlug)?.name ??
      '精選商品'
    );
  }

  add(): void {
    this.store.addToCart(this.product);
  }
}
