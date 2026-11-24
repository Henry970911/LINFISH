import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guides-page',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="guides-hero">
      <div class="container">
        <span class="eyebrow eyebrow--light">AQUARIUM NOTES</span>
        <h1>把複雜的水族知識，<br />說成真的看得懂。</h1>
        <p>從第一個魚缸，到水質管理與魚種搭配，陪你少走一點冤枉路。</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="guide-feature">
          <div class="guide-feature__art">≈<span>START HERE</span></div>
          <div>
            <span class="eyebrow">FEATURED GUIDE</span>
            <h2>第一次養魚，不要先急著買魚</h2>
            <p>先從空間、魚缸尺寸和願意投入的照護時間開始，會比追著設備規格跑更有效。</p>
            <a class="btn btn--dark" routerLink="/guides/first-tank">開始閱讀</a>
          </div>
        </div>
        <div class="section-heading">
          <div>
            <span class="eyebrow">ALL ARTICLES</span>
            <h2>所有文章</h2>
          </div>
        </div>
        <div class="article-grid article-grid--list">
          <a routerLink="/guides/first-tank"
            ><div class="article-art article-art--one">◌</div>
            <small>新手入門 · 5 分鐘</small>
            <h3>第一個魚缸怎麼選？尺寸與設備指南</h3>
            <p>從空間與預算找到適合的起點。</p></a
          ><a routerLink="/guides/water"
            ><div class="article-art article-art--two">≈</div>
            <small>水質管理 · 7 分鐘</small>
            <h3>看懂養水：硝化系統不是越久越好</h3>
            <p>用可以觀察的方式判斷系統是否穩定。</p></a
          ><a routerLink="/guides/mix"
            ><div class="article-art article-art--three">∞</div>
            <small>魚種搭配 · 4 分鐘</small>
            <h3>混養之前，先確認這四個條件</h3>
            <p>體型、個性、水質與活動水層都重要。</p></a
          >
        </div>
      </div>
    </section>`,
})
export class GuidesPageComponent {}
