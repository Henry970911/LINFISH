import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  template: `
    <div class="announcement">
      <span>週一至週五宅配（六日訂單順延至下週一配送）</span>
      <span class="announcement__center">滿 NT$1,200 享本島常溫免運</span>
      <a routerLink="/info/shipping">配送須知 →</a>
    </div>

    <header class="site-header">
      <div class="container header-main">
        <button
          class="icon-btn mobile-only"
          type="button"
          aria-label="開啟選單"
          (click)="menuOpen.update((value) => !value)"
        >
          ☰
        </button>
        <a class="brand" routerLink="/" aria-label="LINFISH 首頁">
          <img class="brand__mark" src="images/linfish-logo.jpg" alt="" width="42" height="42">
          <span><b>LINFISH</b><small>讓水族生活更簡單</small></span>
        </a>

        <form class="search" (ngSubmit)="search()">
          <span aria-hidden="true">⌕</span>
          <input
            name="keyword"
            [(ngModel)]="keyword"
            placeholder="搜尋魚種、水草或器材"
            aria-label="搜尋商品"
          />
          <button type="submit">搜尋</button>
        </form>

        <div class="header-actions">
          @if (store.isMember()) {
            <a class="header-action" routerLink="/account"><span>◎</span><small>會員中心</small></a>
          } @else {
            <a class="header-action" routerLink="/login"><span>♙</span><small>登入</small></a>
          }
          <a class="header-action cart-action" routerLink="/cart">
            <span>▱</span><small>購物車</small><b>{{ store.cartCount() }}</b>
          </a>
        </div>
      </div>

      <nav class="main-nav" [class.main-nav--open]="menuOpen()">
        <div class="container nav-inner">
          <a
            routerLink="/catalog"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            >全部商品</a
          >
          <a routerLink="/catalog" [queryParams]="{ view: 'new' }">本週新品 <em>NEW</em></a>
          @for (category of store.categories().slice(0, 5); track category.id) {
            <a routerLink="/catalog" [queryParams]="{ group: category.slug }">{{
              category.name
            }}</a>
          }
          <a routerLink="/guides">水族小教室</a>
          <a routerLink="/info/about">關於我們</a>
        </div>
      </nav>
    </header>
  `,
})
export class SiteHeaderComponent {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  keyword = '';

  search(): void {
    this.router.navigate(['/catalog'], { queryParams: { q: this.keyword.trim() || null } });
    this.menuOpen.set(false);
  }
}
