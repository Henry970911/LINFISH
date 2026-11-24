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
  styles: `
    .ops-dashboard {
      max-width: 1380px;
      margin: 0 auto;
    }
    .ops-dashboard__head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
    }
    .ops-eyebrow,
    .ops-panel small,
    .ops-module-card small,
    .ops-date small {
      color: #7b8781;
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.16em;
    }
    h1 {
      margin: 8px 0 7px;
      color: #17211d;
      font-size: clamp(30px, 4vw, 44px);
      letter-spacing: -0.04em;
    }
    .ops-dashboard__head p,
    .ops-system-intro p,
    .ops-module-card p,
    .ops-note p {
      margin: 0;
      color: #6c7771;
      line-height: 1.65;
    }
    .ops-date {
      display: grid;
      gap: 5px;
      padding: 13px 16px;
      border: 1px solid #dfe5e2;
      border-radius: 9px;
      background: #fff;
    }
    .ops-date b {
      font:
        650 14px ui-monospace,
        SFMono-Regular,
        monospace;
    }
    .ops-panel {
      border: 1px solid #dfe5e2;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(20, 34, 27, 0.03);
    }
    .ops-system-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      min-height: 148px;
      padding: 28px 30px;
      background-color: #fff;
      background-image: radial-gradient(#d9e1dd 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .ops-system-intro {
      display: flex;
      align-items: center;
      gap: 17px;
      padding: 14px;
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.92);
    }
    .ops-database-icon {
      display: grid;
      width: 48px;
      height: 48px;
      place-items: center;
      border-radius: 10px;
      color: #075f3d;
      background: #39d093;
      font-size: 24px;
    }
    .ops-system-intro h2 {
      margin: 4px 0;
      font-size: 20px;
    }
    .ops-health {
      display: flex;
      min-width: 220px;
      align-items: center;
      gap: 12px;
      padding: 15px 17px;
      border: 1px solid #dce4e0;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.94);
    }
    .ops-health > span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #35c98b;
      box-shadow: 0 0 0 5px rgba(53, 201, 139, 0.13);
    }
    .ops-health div {
      display: grid;
      gap: 2px;
    }
    .ops-health small {
      color: #809089;
      font-size: 11px;
    }
    .ops-module-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin: 22px 0;
    }
    .ops-module-card {
      display: flex;
      min-height: 230px;
      flex-direction: column;
      justify-content: space-between;
      padding: 22px;
      border: 1px solid #dfe5e2;
      border-radius: 11px;
      color: #18211d;
      background: #fff;
      text-decoration: none;
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease;
    }
    .ops-module-card:hover {
      transform: translateY(-3px);
      border-color: #9dd8bf;
      box-shadow: 0 12px 30px rgba(23, 51, 40, 0.08);
    }
    .ops-module-card__code {
      display: grid;
      width: 38px;
      height: 38px;
      place-items: center;
      border: 1px solid #dce5e0;
      border-radius: 8px;
      color: #167e55;
      background: #eef9f4;
      font:
        700 12px ui-monospace,
        monospace;
    }
    .ops-module-card h2 {
      margin: 6px 0 7px;
      font-size: 20px;
    }
    .ops-module-card__footer {
      display: flex;
      align-items: center;
      gap: 7px;
      padding-top: 14px;
      border-top: 1px solid #edf0ee;
      color: #6c7771;
      font-size: 12px;
    }
    .ops-module-card__footer em {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #35c98b;
    }
    .ops-module-card__footer b {
      margin-left: auto;
      color: #1c7c58;
      font-size: 17px;
    }
    .ops-bottom-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 22px;
    }
    .ops-bottom-grid .ops-panel {
      padding: 23px;
    }
    .ops-panel__head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      margin-bottom: 17px;
    }
    .ops-panel__head h2 {
      margin: 5px 0 0;
      font-size: 18px;
    }
    .ops-live {
      padding: 4px 7px;
      border: 1px solid #bee7d5;
      border-radius: 999px;
      color: #188157;
      background: #effaf5;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.12em;
    }
    .ops-status-list {
      display: grid;
    }
    .ops-status-list div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0;
      border-top: 1px solid #edf0ee;
    }
    .ops-status-list span {
      color: #6c7771;
      font-size: 13px;
    }
    .ops-status-list b {
      font:
        650 12px ui-monospace,
        SFMono-Regular,
        monospace;
    }
    .ops-status-list i {
      display: inline-block;
      width: 7px;
      height: 7px;
      margin-right: 7px;
      border-radius: 50%;
      background: #35c98b;
    }
    .ops-note span {
      display: block;
      margin-top: 17px;
      padding: 14px;
      border-left: 3px solid #35c98b;
      color: #53605a;
      background: #f3faf7;
      font-size: 13px;
      line-height: 1.6;
    }
    @media (max-width: 1100px) {
      .ops-module-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 720px) {
      .ops-dashboard__head,
      .ops-system-panel {
        align-items: stretch;
        flex-direction: column;
      }
      .ops-module-grid,
      .ops-bottom-grid {
        grid-template-columns: 1fr;
      }
      .ops-health {
        min-width: 0;
      }
    }
  `,
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
