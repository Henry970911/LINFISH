import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="ops-dashboard">
      <header class="ops-dashboard__head">
        <div>
          <span class="ops-eyebrow">LINFISH OPERATIONS</span>
          <h1>管理控制中心</h1>
        </div>
        <div class="ops-date">
          <small>SYSTEM DATE</small>
          <b>{{ today | date: 'yyyy.MM.dd' }}</b>
        </div>
      </header>

      <div class="ops-panel ops-system-panel">
        <div class="ops-system-intro">
          <span class="ops-database-icon">▤</span>
          <div>
            <small>PRIMARY OPERATIONS</small>
            <h2>LINFISH 管理系統</h2>
            <p>管理者身分已通過後端角色驗證。</p>
          </div>
        </div>
        <div class="ops-health">
          <span></span>
          <div><b>System healthy</b><small>Admin access active</small></div>
        </div>
      </div>

      <div class="ops-module-grid">
        @for (module of modules; track module.route) {
          <a class="ops-module-card" [routerLink]="module.route">
            <span class="ops-module-card__code">{{ module.code }}</span>
            <div>
              <small>{{ module.english }}</small>
              <h2>{{ module.title }}</h2>
              <p>{{ module.description }}</p>
            </div>
            <span class="ops-module-card__footer"> <em></em>模組骨架已就緒 <b>→</b> </span>
          </a>
        }
      </div>

      <div class="ops-bottom-grid">
        <section class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <small>ACCESS CONTROL</small>
              <h2>權限與連線狀態</h2>
            </div>
            <span class="ops-live">LIVE</span>
          </div>
          <div class="ops-status-list">
            <div>
              <span>後端 API</span><b><i></i>已連線</b>
            </div>
            <div><span>會員資料來源</span><b>cmbase.ogcusr</b></div>
            <div><span>目前角色</span><b>Admin</b></div>
            <div><span>工作階段</span><b>短效權杖＋自動逾時</b></div>
          </div>
        </section>

        <section class="ops-panel ops-note">
          <div class="ops-panel__head">
            <div>
              <small>IMPLEMENTATION</small>
              <h2>本階段範圍</h2>
            </div>
          </div>
            <p>商品、規格及訂單資料使用資料庫中的資料表。</p>
          <span>財務與倉儲功能尚在規劃。</span>
        </section>
      </div>
    </section>
  `,
  styleUrl: '../../css/admin/admin-dashboard.page.scss',
})
export class AdminDashboardPageComponent {
  readonly today = new Date();
  readonly modules = [
    {
      code: 'PD',
      english: 'PRODUCTS',
      title: '商品管理',
      description: '商品主檔、分類、價格與上下架。',
      route: '/admin/products',
    },
    {
      code: 'MB',
      english: 'MEMBERS',
      title: '會員管理',
      description: '會員資料、等級與帳號狀態。',
      route: '/admin/members',
    },
    {
      code: 'FN',
      english: 'FINANCE',
      title: '財務管理',
      description: '收支、付款對帳與營運報表。',
      route: '/admin/finance',
    },
    {
      code: 'WH',
      english: 'WAREHOUSE',
      title: '倉儲管理',
      description: '庫存、入出庫與安全庫存提醒。',
      route: '/admin/warehouse',
    },
  ];
}
