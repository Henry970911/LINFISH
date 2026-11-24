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
        <a class="ops-brand" routerLink="/admin" aria-label="LINFISH 管理首頁">
          <span class="ops-brand__mark">L</span>
          <span class="ops-brand__copy">
            <b>LINFISH</b>
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
              <small>LINFISH SYSTEM</small>
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
  styles: `
    :host {
      --rail-width: 68px;
      --rail-open-width: 258px;
      --green: #34c98b;
      --ink: #18211d;
      display: block;
      min-height: 100vh;
      color: var(--ink);
      background: #f7f9f8;
    }
    .ops-rail {
      position: fixed;
      z-index: 30;
      inset: 0 auto 0 0;
      width: var(--rail-width);
      overflow: hidden;
      border-right: 1px solid #e2e7e4;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 10px 0 24px rgba(22, 33, 28, 0);
      transition:
        width 180ms ease,
        box-shadow 180ms ease;
    }
    .ops-rail:hover,
    .ops-rail:focus-within {
      width: var(--rail-open-width);
      box-shadow: 14px 0 34px rgba(22, 33, 28, 0.09);
    }
    .ops-brand {
      display: flex;
      align-items: center;
      width: var(--rail-open-width);
      height: 70px;
      gap: 14px;
      padding: 0 14px;
      border-bottom: 1px solid #edf0ee;
      color: var(--ink);
      text-decoration: none;
    }
    .ops-brand__mark {
      display: grid;
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      place-items: center;
      border-radius: 11px;
      background: #112c25;
      color: white;
      font:
        italic 700 21px Georgia,
        serif;
    }
    .ops-brand__copy,
    .ops-nav__text {
      display: grid;
      min-width: 0;
      opacity: 0;
      transform: translateX(-4px);
      transition:
        opacity 120ms ease 35ms,
        transform 120ms ease 35ms;
    }
    .ops-rail:hover .ops-brand__copy,
    .ops-rail:focus-within .ops-brand__copy,
    .ops-rail:hover .ops-nav__text,
    .ops-rail:focus-within .ops-nav__text {
      opacity: 1;
      transform: translateX(0);
    }
    .ops-brand__copy small,
    .ops-nav__text small {
      color: #8a938f;
      font-size: 11px;
    }
    .ops-nav {
      width: var(--rail-open-width);
      padding: 20px 10px;
    }
    .ops-nav__caption {
      height: 22px;
      margin: 0 0 8px 58px;
      color: #9aa39f;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.17em;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .ops-rail:hover .ops-nav__caption,
    .ops-rail:focus-within .ops-nav__caption {
      opacity: 1;
    }
    .ops-nav__item,
    .ops-store-link {
      display: flex;
      align-items: center;
      width: 238px;
      min-height: 54px;
      gap: 13px;
      margin-bottom: 5px;
      padding: 7px 12px;
      border: 1px solid transparent;
      border-radius: 9px;
      color: #59635e;
      text-decoration: none;
    }
    .ops-nav__item:hover,
    .ops-store-link:hover {
      color: #17211d;
      background: #f3f5f4;
    }
    .ops-nav__item.is-active {
      border-color: #dce6e1;
      color: #10251d;
      background: #edf9f4;
    }
    .ops-nav__item.is-active .ops-nav__icon {
      color: #19865c;
      background: #d8f4e8;
    }
    .ops-nav__icon {
      display: grid;
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 7px;
      color: #727c77;
    }
    .ops-nav__icon svg {
      width: 19px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }
    .ops-nav__text {
      gap: 2px;
      white-space: nowrap;
    }
    .ops-nav__text b {
      font-size: 14px;
      font-weight: 650;
    }
    .ops-rail__footer {
      position: absolute;
      right: 10px;
      bottom: 14px;
      left: 10px;
      width: 238px;
      padding-top: 12px;
      border-top: 1px solid #edf0ee;
    }
    .ops-workspace {
      min-height: 100vh;
      margin-left: var(--rail-width);
    }
    .ops-topbar {
      position: sticky;
      z-index: 20;
      top: 0;
      display: flex;
      min-height: 70px;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      border-bottom: 1px solid #e2e7e4;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(16px);
    }
    .ops-topbar__context,
    .ops-account {
      display: flex;
      align-items: center;
    }
    .ops-topbar__context {
      gap: 11px;
    }
    .ops-topbar__context div,
    .ops-account__details {
      display: grid;
      gap: 1px;
    }
    .ops-topbar__context small,
    .ops-account__details small {
      color: #89928e;
      font-size: 10px;
      letter-spacing: 0.12em;
    }
    .ops-status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 5px rgba(52, 201, 139, 0.12);
    }
    .ops-account {
      gap: 10px;
    }
    .ops-account__role {
      padding: 5px 8px;
      border: 1px solid #cde9dc;
      border-radius: 999px;
      color: #148052;
      background: #eefaf5;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.13em;
    }
    .ops-account__avatar {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 9px;
      color: white;
      background: #173b31;
      font-weight: 700;
    }
    .ops-account__details b {
      font-size: 13px;
    }
    .ops-account button {
      margin-left: 6px;
      padding: 7px 11px;
      border: 1px solid #dce2df;
      border-radius: 7px;
      color: #58615d;
      background: white;
      cursor: pointer;
    }
    .ops-content {
      min-height: calc(100vh - 70px);
      padding: 34px clamp(22px, 4vw, 64px) 60px;
    }
    @media (max-width: 720px) {
      :host {
        --rail-width: 60px;
        --rail-open-width: 238px;
      }
      .ops-brand {
        padding-inline: 10px;
      }
      .ops-brand__mark {
        flex-basis: 38px;
        width: 38px;
        height: 38px;
      }
      .ops-account__role,
      .ops-account__details,
      .ops-topbar__context div {
        display: none;
      }
      .ops-topbar {
        padding-inline: 16px;
      }
    }
  `,
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
