import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `<div class="admin-page-head">
      <div>
        <span>商品管理</span>
        <h1>商品列表</h1>
        <p>管理商品資訊、價格、庫存與上下架狀態。</p>
      </div>
      <a class="admin-primary-btn" routerLink="/admin/products/new">＋ 新增商品</a>
    </div>
    <div class="admin-tabs">
      <button class="active">
        全部商品 <b>{{ store.products().length }}</b></button
      ><button>上架中 <b>8</b></button><button>草稿 <b>2</b></button
      ><button>低庫存 <b>4</b></button>
    </div>
    <section class="admin-card admin-list-card">
      <div class="admin-filters">
        <label class="admin-search"
          >⌕ <input [(ngModel)]="keyword" placeholder="搜尋商品名稱或 SKU" /></label
        ><select>
          <option>所有分類</option>
          @for (category of store.categories(); track category.id) {
            <option>{{ category.name }}</option>
          }</select
        ><select>
          <option>所有狀態</option>
          <option>上架中</option>
          <option>草稿</option></select
        ><button type="button">篩選</button>
      </div>
      <div class="product-admin-table">
        <div class="product-admin-row product-admin-head">
          <span><input type="checkbox" /></span><span>商品</span><span>分類</span><span>售價</span
          ><span>庫存</span><span>狀態</span><span></span>
        </div>
        @for (product of store.products(); track product.id) {
          <div class="product-admin-row">
            <span><input type="checkbox" /></span
            ><span class="admin-product"
              ><i [style.background]="product.gradient">{{ product.emoji }}</i>
              <p>
                <b>{{ product.name }}</b><small
                  >SKU LF-{{ product.id.toString().padStart(4, '0') }}</small
                >
              </p></span
            ><span>{{ categoryName(product.categorySlug) }}</span
            ><strong>{{ product.price | currency: 'TWD' : 'NT$' : '1.0-0' }}</strong
            ><span [class.low-stock]="product.stock < 10">{{ product.stock }} 件</span
            ><span class="status status--live">● 上架中</span
            ><span class="row-actions"
              ><a [routerLink]="['/admin/products', product.id]">編輯</a><button>•••</button></span
            >
          </div>
        }
      </div>
      <div class="table-footer">
        <span>顯示 1–10，共 {{ store.products().length }} 件</span>
        <div>
          <button disabled>←</button><button class="active">1</button><button>2</button
          ><button>→</button>
        </div>
      </div>
    </section>`,
})
export class AdminProductsPageComponent {
  readonly store = inject(StoreService);
  readonly keyword = signal('');
  categoryName(slug: string): string {
    return this.store.categories().find((item) => item.slug === slug)?.name ?? '-';
  }
}
