import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide-detail-page',
  standalone: true,
  imports: [RouterLink],
  template: `<article class="guide-article">
    <header>
      <a routerLink="/guides">← 水族小教室</a><span class="eyebrow">BEGINNER'S GUIDE</span>
      <h1>{{ title }}</h1>
      <p>{{ lead }}</p>
      <div><span>魚軒水族館 編輯部</span><span>2026/11/18</span><span>閱讀時間 5 分鐘</span></div>
    </header>
    <div class="guide-cover">{{ icon }}<small>文章主視覺預留區</small></div>
    <div class="prose guide-body">
      <p class="lead-paragraph">
        養魚最常見的錯誤不是設備買得不夠，而是在還不了解魚缸條件之前，就先把喜歡的魚帶回家。
      </p>
      <h2>先從你能提供的環境開始</h2>
      <p>
        確認魚缸擺放位置、可用尺寸、日常換水是否方便，再決定設備與生物。穩定的日常維護，比一次買齊昂貴設備更重要。
      </p>
      <blockquote>先建立一個你照顧得來的系統，再選擇適合住進來的生物。</blockquote>
      <h2>新手的四項確認清單</h2>
      <ol>
        <li><b>空間與承重</b><span>一公升水接近一公斤，還需加上缸體、底砂與造景重量。</span></li>
        <li><b>換水動線</b><span>距離水源太遠，會讓日後每一次維護都變得困難。</span></li>
        <li><b>魚種成體尺寸</b><span>不要只看販售時的幼魚大小，要預留成長與活動空間。</span></li>
        <li><b>可投入時間</b><span>選擇與生活節奏相符的系統，才有機會長期穩定。</span></li>
      </ol>
      <div class="article-cta">
        <span>還是不確定？</span>
        <h3>告訴我們你的空間與預算</h3>
        <p>客服可以協助整理第一份設備與魚種清單。</p>
        <a class="btn btn--coral" routerLink="/contact">詢問客服</a>
      </div>
    </div>
  </article>`,
})
export class GuideDetailPageComponent {
  private readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug');
  readonly title =
    this.slug === 'water'
      ? '看懂養水：硝化系統不是越久越好'
      : this.slug === 'mix'
        ? '混養之前，先確認這四個條件'
        : '第一個魚缸怎麼選？新手尺寸與設備指南';
  readonly lead =
    this.slug === 'water'
      ? '用觀察與測試理解魚缸是否真的準備好了。'
      : this.slug === 'mix'
        ? '喜歡的魚不一定適合住在一起，先看懂關鍵條件。'
        : '先從空間、維護習慣與想養的魚開始，不讓設備清單帶著你走。';
  readonly icon = this.slug === 'water' ? '≈' : this.slug === 'mix' ? '∞' : '◌';
}
