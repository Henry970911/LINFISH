import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CurrencyPipe, ProductCardComponent, RouterLink],
  template: `
    <section class="hero">
      <div class="hero__watermark">AQUATIC<br />LIVING</div>
      <div class="hero__bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="container hero__inner">
        <div class="hero__copy">
          <span class="eyebrow eyebrow--light">WEEKLY SELECTION · 11/18</span>
          <h1>把喜歡的水中風景，<br /><em>好好帶回家。</em></h1>
          <p>從魚隻狀態、飼養資訊到出貨包裝，每個細節都替你先想一步。</p>
          <div class="hero__actions">
            <a class="btn btn--coral" routerLink="/catalog">探索本週新品</a
            ><a class="text-link text-link--light" routerLink="/guides"
              >第一次養魚？從這裡開始 <span>→</span></a
            >
          </div>
          <div class="hero__proof">
            <div><b>48h</b><span>穩定觀察後上架</span></div>
            <div><b>1:1</b><span>到貨狀況協助</span></div>
            <div><b>7 days</b><span>每日營業服務</span></div>
          </div>
        </div>
        <div class="hero__visual">
          <div class="tank-card">
            <span class="tank-card__label">EDITOR'S PICK</span>
            <div class="tank-scene">
              <span class="fish fish--one">🐠</span><span class="fish fish--two">🐟</span
              ><span class="plant">🌿</span><span class="plant plant--two">🌿</span>
            </div>
            <div class="tank-card__info">
              <div>
                <small>本週主打</small>
                <h3>黃金檸檬琴尾茉莉</h3>
              </div>
              @if (store.isMember()) {
                <b>{{ 180 | currency: 'TWD' : 'NT$' : '1.0-0' }}</b>
              } @else {
                <a routerLink="/login">會員價</a>
              }
            </div>
          </div>
          <span class="hero-note">健康觀察紀錄<br />隨出貨批次更新</span>
        </div>
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
          <span class="eyebrow">WHY LINFISH</span>
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
}
