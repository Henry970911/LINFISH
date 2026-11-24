import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-generic-page',
  standalone: true,
  template: `<div class="admin-page-head">
      <div>
        <span>{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <button class="admin-primary-btn">＋ {{ action }}</button>
    </div>
    <section class="admin-card generic-admin">
      <div class="admin-filters">
        <label class="admin-search">⌕ <input [placeholder]="searchPlaceholder" /></label
        ><select>
          <option>所有狀態</option>
          <option>啟用中</option>
          <option>停用</option></select
        ><button>篩選</button>
      </div>
      <div class="generic-list">
        @for (item of items; track item.name) {
          <div>
            <span>{{ item.icon }}</span>
            <p>
              <b>{{ item.name }}</b><small>{{ item.meta }}</small>
            </p>
            <em class="status status--live">● 啟用中</em><button>編輯</button>
          </div>
        }
      </div>
    </section>`,
})
export class AdminGenericPageComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title = this.data['title'];
  readonly eyebrow = this.data['eyebrow'];
  readonly description = this.data['description'];
  readonly action = this.data['action'];
  readonly searchPlaceholder = this.data['searchPlaceholder'];
  readonly items = this.data['items'] ?? [
    { icon: '◫', name: '首頁主視覺 Banner', meta: '顯示於首頁 · 2026/11/01–11/30' },
    { icon: '◌', name: '新手魚缸選購指南', meta: '文章 · 已發布' },
    { icon: '♙', name: '林小姐', meta: 'demo@linfish.tw · 一般會員' },
  ];
}
