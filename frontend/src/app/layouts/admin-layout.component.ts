import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar" [class.admin-sidebar--open]="menuOpen()">
        <a class="admin-brand" routerLink="/admin"><span>L</span><b>LINFISH <small>管理後台</small></b></a>
        <nav>
          <span class="admin-nav-label">營運概況</span>
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">⌂ 儀表板</a>
          <span class="admin-nav-label">商品管理</span>
          <a routerLink="/admin/products" routerLinkActive="active">▦ 商品列表</a>
          <a routerLink="/admin/categories" routerLinkActive="active">⌘ 商品分類</a>
          <span class="admin-nav-label">訂單與會員</span>
          <a routerLink="/admin/orders" routerLinkActive="active">▤ 訂單管理</a>
          <a routerLink="/admin/customers" routerLinkActive="active">♙ 會員管理</a>
          <span class="admin-nav-label">網站內容</span>
          <a routerLink="/admin/content" routerLinkActive="active">◫ Banner 與文章</a>
          <a routerLink="/admin/settings" routerLinkActive="active">⚙ 商店設定</a>
        </nav>
        <a class="back-store" routerLink="/">← 返回前台</a>
      </aside>
      <section class="admin-main">
        <header class="admin-topbar"><button type="button" class="icon-btn" (click)="menuOpen.update((value) => !value)">☰</button><div class="admin-topbar__right"><span class="prototype-pill">展示模式</span><span class="admin-avatar">林</span><div><b>管理員</b><small>admin&#64;linfish.tw</small></div></div></header>
        <div class="admin-content"><router-outlet /></div>
      </section>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly menuOpen = signal(false);
}

