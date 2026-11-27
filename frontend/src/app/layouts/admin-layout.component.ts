import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

interface AdminNavigationItem {
  label: string;
  caption: string;
  route: string;
  icon: 'box' | 'users' | 'chart' | 'warehouse';
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="ops-shell">
      <aside class="ops-rail" aria-label="管理功能選單">
        <a class="ops-brand" routerLink="/admin" aria-label="魚軒水族館 管理首頁">
          <img class="ops-brand__mark" src="images/linfish-logo.jpg" alt="" width="42" height="42">
          <span class="ops-brand__copy">
            <b>魚軒水族館</b>
            <small>Operations</small>
          </span>
        </a>

        <nav class="ops-nav">
          <p class="ops-nav__caption">MANAGEMENT</p>

          @for (item of navigation; track item.route) {
            <a
              class="ops-nav__item"
              [routerLink]="item.route"
              routerLinkActive="is-active"
              [attr.aria-label]="item.label"
            >
              <span class="ops-nav__icon">
                @switch (item.icon) {
                  @case ('box') {
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" />
                    </svg>
                  }
                  @case ('users') {
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                      />
                    </svg>
                  }
                  @case ('chart') {
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3v18h18M7 16l4-5 4 3 5-7" />
                    </svg>
                  }
                  @default {
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 21V8l9-5 9 5v13M3 10h18M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2M15 18h2"
                      />
                    </svg>
                  }
                }
              </span>
              <span class="ops-nav__text">
                <b>{{ item.label }}</b>
                <small>{{ item.caption }}</small>
              </span>
            </a>
          }
        </nav>

        <div class="ops-rail__footer">
          <a class="ops-store-link" routerLink="/">
            <span class="ops-nav__icon">↗</span>
            <span class="ops-nav__text"><b>返回商店</b><small>Storefront</small></span>
          </a>
        </div>
      </aside>

      <section class="ops-workspace">
        <header class="ops-topbar">
          <div class="ops-topbar__context">
            <span class="ops-status-dot"></span>
            <div>
              <small>魚軒水族館系統</small>
              <b>營運管理平台</b>
            </div>
          </div>

          <div class="ops-account">
            <span class="ops-account__role">ADMIN</span>
            <span class="ops-account__avatar">{{ memberInitial }}</span>
            <span class="ops-account__details">
              <b>{{ member()?.userName || '管理者' }}</b>
              <small>{{ member()?.userNo || 'Administrator' }}</small>
            </span>
            <button type="button" (click)="logout()">登出</button>
          </div>
        </header>

        <main class="ops-content"><router-outlet /></main>
      </section>
    </div>
  `,
  styleUrl: '../css/admin/admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly member = this.authService.currentMember;
  readonly navigation: AdminNavigationItem[] = [
    { label: '商品管理', caption: 'Products', route: '/admin/products', icon: 'box' },
    { label: '訂單管理', caption: 'Orders', route: '/admin/orders', icon: 'chart' },
    { label: '稅別與物流', caption: 'Tax & Shipping', route: '/admin/settings', icon: 'warehouse' },
    { label: '會員管理', caption: 'Members', route: '/admin/members', icon: 'users' },
    { label: '財務管理', caption: 'Finance', route: '/admin/finance', icon: 'chart' },
    { label: '倉儲管理', caption: 'Warehouse', route: '/admin/warehouse', icon: 'warehouse' },
  ];

  get memberInitial(): string {
    return this.member()?.userName?.slice(0, 1).toUpperCase() || 'A';
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigateByUrl('/login');
  }
}
