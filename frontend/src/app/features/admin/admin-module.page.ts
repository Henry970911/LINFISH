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
  styleUrl: '../../css/admin/admin-module.page.scss',
})
export class AdminModulePageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly data = this.route.snapshot.data as AdminModuleData;
}
