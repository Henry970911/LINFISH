import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  template: `
    <section class="lobby-carousel" aria-label="門市照片輪播" aria-roledescription="輪播"
      (mouseenter)="pause()" (mouseleave)="resume()" (focusin)="pause()" (focusout)="onFocusOut($event)">
      @for (slide of slides; track slide; let i = $index) {
        <img class="lobby-carousel__image" [class.is-active]="activeSlide() === i"
          [src]="slide" [alt]="activeSlide() === i ? '魚軒水族門市照片 ' + (i + 1) : ''"
          [attr.aria-hidden]="activeSlide() !== i" [attr.fetchpriority]="i === 0 ? 'high' : 'low'" />
      }
      <button class="lobby-carousel__arrow lobby-carousel__arrow--previous" type="button"
        aria-label="上一張照片" (click)="move(-1)">‹</button>
      <button class="lobby-carousel__arrow lobby-carousel__arrow--next" type="button"
        aria-label="下一張照片" (click)="move(1)">›</button>
      <div class="lobby-carousel__dots" aria-label="選擇照片">
        @for (slide of slides; track slide; let i = $index) {
          <button type="button" class="lobby-carousel__dot" [class.is-active]="activeSlide() === i"
            [attr.aria-label]="'顯示第 ' + (i + 1) + ' 張照片'"
            [attr.aria-current]="activeSlide() === i ? 'true' : null" (click)="activeSlide.set(i)"></button>
        }
      </div>
    </section>

    <section class="benefit-strip">
      <div class="container benefit-grid">
        <div>
          <span>01</span>
          <p><b>狀態透明</b>每批商品清楚標示尺寸與照護難度</p>
        </div>
        <div>
          <span>02</span>
          <p><b>細心包裝</b>依季節與路程調整保溫、含氧配置</p>
        </div>
        <div>
          <span>03</span>
          <p><b>新手友善</b>選購前後都有清楚的飼養建議</p>
        </div>
      </div>
    </section>

    <section class="section categories-section">
      <div class="container">
        <div class="section-heading">
          <div>
            <span class="eyebrow">SHOP BY WORLD</span>
            <h2>從想打造的水中世界開始</h2>
          </div>
          <a class="text-link" routerLink="/catalog">查看所有分類 <span>→</span></a>
        </div>
        <div class="category-grid">
          @for (category of store.categories(); track category.id) {
            <a
              class="category-card"
              routerLink="/catalog"
              [queryParams]="{ category: category.slug }"
              [style.--accent]="category.accent"
            >
              <span class="category-card__icon">{{ category.icon }}</span>
              <div>
                <small>{{ category.itemCount }} ITEMS</small>
                <h3>{{ category.name }}</h3>
                <p>{{ category.description }}</p>
              </div>
              <b>↗</b>
            </a>
          }
        </div>
      </div>
    </section>

    <section class="section section--tinted">
      <div class="container">
        <div class="section-heading">
          <div>
            <span class="eyebrow">CURATED THIS WEEK</span>
            <h2>本週精選</h2>
            <p>依據狀態、季節與飼養難度挑選的安心選擇。</p>
          </div>
          <a class="text-link" routerLink="/catalog">完整商品列表 <span>→</span></a>
        </div>
        <div class="product-grid">
          @for (product of store.featuredProducts(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      </div>
    </section>

    <section class="section story-section">
      <div class="container story-grid">
        <div class="story-visual">
          <div class="story-aquarium"><span>🐟</span><span>🌿</span><span>🐠</span></div>
          <div class="story-card">
            <b>03</b><span>每一批進貨<br />至少三次狀態確認</span>
          </div>
        </div>
        <div class="story-copy">
          <span class="eyebrow">認識魚軒水族館</span>
          <h2>不是只把魚賣出去，<br />而是陪牠好好住進新家。</h2>
          <p>
            我們相信，好的水族體驗從「理解」開始。每個商品頁都會整理適合水質、溫度、成體尺寸與混養建議，讓你在帶回家之前，就知道該怎麼照顧。
          </p>
          <ul>
            <li><span>✓</span>商品狀態與適養資訊清楚標示</li>
            <li><span>✓</span>依照魚種與季節選擇包裝方式</li>
            <li><span>✓</span>到貨後可由客服協助判斷狀態</li>
          </ul>
          <a class="btn btn--dark" routerLink="/info/about">認識我們的堅持</a>
        </div>
      </div>
    </section>

    <section class="section guide-preview">
      <div class="container">
        <div class="section-heading">
          <div>
            <span class="eyebrow">AQUARIUM NOTES</span>
            <h2>水族小教室</h2>
          </div>
          <a class="text-link" routerLink="/guides">閱讀全部文章 <span>→</span></a>
        </div>
        <div class="article-grid">
          <a routerLink="/guides/first-tank"
            ><span class="article-index">GUIDE 01</span>
            <div class="article-art article-art--one">◌</div>
            <h3>第一個魚缸怎麼選？新手尺寸與設備指南</h3>
            <p>5 分鐘閱讀 · 新手入門</p></a
          ><a routerLink="/guides/water"
            ><span class="article-index">GUIDE 02</span>
            <div class="article-art article-art--two">≈</div>
            <h3>看懂養水：硝化系統不是越久越好</h3>
            <p>7 分鐘閱讀 · 水質管理</p></a
          ><a routerLink="/guides/mix"
            ><span class="article-index">GUIDE 03</span>
            <div class="article-art article-art--three">∞</div>
            <h3>混養之前，先確認這四個條件</h3>
            <p>4 分鐘閱讀 · 魚種搭配</p></a
          >
        </div>
      </div>
    </section>
  `,
})
export class HomePageComponent {
  readonly store = inject(StoreService);
  readonly slides = Array.from({ length: 5 }, (_, index) => `/images/lobby/Lobby_${index + 1}.jpg`);
  readonly activeSlide = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    this.resume();
    inject(DestroyRef).onDestroy(() => this.pause());
  }
  move(offset: number): void { this.activeSlide.update(index => (index + offset + this.slides.length) % this.slides.length); }
  pause(): void { clearInterval(this.timer); this.timer = undefined; }
  resume(): void { if (!this.timer && !this.reducedMotion.matches) this.timer = setInterval(() => this.move(1), 5000); }
  onFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.resume();
  }
}
