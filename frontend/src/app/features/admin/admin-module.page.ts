import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface AdminModuleData {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
}

@Component({
  selector: 'app-admin-module-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="module-page">
      <nav class="module-breadcrumb">
        <a routerLink="/admin">管理中心</a><span>/</span><b>{{ data.title }}</b>
      </nav>

      <header class="module-head">
        <div>
          <span>{{ data.eyebrow }}</span>
          <h1>{{ data.title }}</h1>
          <p>{{ data.description }}</p>
        </div>
        <span class="module-stage"><i></i> INTERFACE READY</span>
      </header>

      <div class="module-flow">
        @for (item of data.items; track item; let index = $index) {
          <article>
            <span>0{{ index + 1 }}</span>
            <small>WORK AREA</small>
            <h2>{{ item }}</h2>
            <p>此功能區的介面入口已保留，待資料表欄位確認後串接。</p>
          </article>
        }
      </div>

      <section class="module-empty">
        <div class="module-empty__icon">⌁</div>
        <div>
          <small>DATA SOURCE PENDING</small>
          <h2>尚未建立此模組的資料表</h2>
          <p>依照目前需求，本階段只完成管理介面、Admin 權限與路由；沒有建立假資料或額外資料表。</p>
        </div>
      </section>
    </section>
  `,
  styles: `
    .module-page {
      max-width: 1300px;
      margin: 0 auto;
    }
    .module-breadcrumb {
      display: flex;
      gap: 9px;
      align-items: center;
      margin-bottom: 30px;
      color: #8a948f;
      font-size: 12px;
    }
    .module-breadcrumb a {
      color: #39735c;
      text-decoration: none;
    }
    .module-breadcrumb b {
      color: #4e5954;
    }
    .module-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
    }
    .module-head > div > span,
    .module-empty small,
    .module-flow small {
      color: #78847e;
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.16em;
    }
    h1 {
      margin: 8px 0 6px;
      color: #18211d;
      font-size: clamp(30px, 4vw, 43px);
      letter-spacing: -0.04em;
    }
    .module-head p,
    .module-flow p,
    .module-empty p {
      margin: 0;
      color: #6b7771;
      line-height: 1.65;
    }
    .module-stage {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 11px;
      border: 1px solid #cce8dc;
      border-radius: 7px;
      color: #197b55;
      background: #effaf5;
      font:
        750 10px ui-monospace,
        monospace;
    }
    .module-stage i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34c98b;
    }
    .module-flow {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .module-flow article {
      position: relative;
      min-height: 210px;
      padding: 24px;
      overflow: hidden;
      border: 1px solid #dfe5e2;
      border-radius: 11px;
      background: #fff;
    }
    .module-flow article > span {
      position: absolute;
      top: 12px;
      right: 17px;
      color: #e2e8e5;
      font:
        700 42px ui-monospace,
        monospace;
    }
    .module-flow h2 {
      margin: 50px 0 9px;
      font-size: 19px;
    }
    .module-flow p {
      font-size: 13px;
    }
    .module-empty {
      display: flex;
      align-items: center;
      gap: 20px;
      min-height: 190px;
      margin-top: 22px;
      padding: 28px;
      border: 1px dashed #cad5d0;
      border-radius: 12px;
      background-color: #fbfcfb;
      background-image: radial-gradient(#e1e7e4 1px, transparent 1px);
      background-size: 18px 18px;
    }
    .module-empty > div:last-child {
      max-width: 650px;
      padding: 14px;
      border-radius: 8px;
      background: rgba(251, 252, 251, 0.94);
    }
    .module-empty__icon {
      display: grid;
      flex: 0 0 54px;
      width: 54px;
      height: 54px;
      place-items: center;
      border: 1px solid #d8e1dd;
      border-radius: 10px;
      color: #20835d;
      background: #eff9f5;
      font-size: 27px;
    }
    .module-empty h2 {
      margin: 5px 0 7px;
      font-size: 19px;
    }
    @media (max-width: 820px) {
      .module-flow {
        grid-template-columns: 1fr;
      }
      .module-head {
        align-items: start;
        flex-direction: column;
      }
    }
  `,
})
export class AdminModulePageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly data = this.route.snapshot.data as AdminModuleData;
}
