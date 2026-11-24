import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="newsletter">
      <div class="container newsletter__inner">
        <div>
          <span class="eyebrow">LINFISH LETTER</span>
          <h2>把新魚、新知和優惠送進信箱</h2>
          <p>每兩週一封，不打擾，只分享真正有用的水族內容。</p>
        </div>
        <form class="newsletter__form">
          <input type="email" placeholder="你的 Email" aria-label="訂閱 Email" /><button
            class="btn btn--light"
            type="button"
          >
            免費訂閱
          </button>
        </form>
      </div>
    </section>
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <a class="brand brand--footer" routerLink="/"
            ><span class="brand__mark">L</span
            ><span><b>魚軒水族量販店</b><small>讓水族生活更簡單</small></span></a
          >
          <p>以清楚的飼養資訊、穩定的個體狀態與細心包裝，陪你建立喜歡的水中風景。</p>
          <div class="social-row"><span>LINE</span><span>FB</span><span>IG</span></div>
        </div>
        <div>
          <h3>開始逛逛</h3>
          <a routerLink="/catalog">所有商品</a
          ><a routerLink="/catalog" [queryParams]="{ view: 'new' }">本週新品</a
          ><a routerLink="/catalog" [queryParams]="{ category: 'tropical-fish' }">觀賞魚</a
          ><a routerLink="/catalog" [queryParams]="{ category: 'plants' }">水草造景</a>
        </div>
        <div>
          <h3>購物協助</h3>
          <a routerLink="/info/shipping">付款與配送</a><a routerLink="/info/returns">到貨與售後</a
          ><a routerLink="/info/vip">會員權益</a><a routerLink="/contact">聯絡我們</a>
        </div>
        <div>
          <h3>營業時間</h3>
          <p>週一至週六<br />早上 11:00～晚上 9:00</p>
          <p>週日<br />早上 11:00～晚上 6:00</p>
          <h3>宅配時間</h3>
          <p>週一至週五<br />六日訂單順延到下週一配送</p>
          <p>颱風天、連假停止宅配服務</p>
          <a class="line-link" routerLink="/contact">加入 LINE 客服 →</a>
        </div>
      </div>
      <div></div>
      <div class="container footer-bottom">
        <span>© 2026 LINFISH. Prototype storefront.</span><span>隱私權政策 · 網站使用條款</span>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {}
