import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-admin-product-editor-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<div class="admin-page-head admin-editor-head">
      <div>
        <a routerLink="/admin/products">← 返回商品列表</a>
        <h1>{{ isNew ? '新增商品' : '編輯商品' }}</h1>
        <p>{{ isNew ? '建立商品資料、規格與庫存。' : '最後更新：2026/11/18 10:42' }}</p>
      </div>
      <div>
        <button class="admin-secondary-btn">儲存草稿</button
        ><button class="admin-primary-btn">{{ isNew ? '建立並上架' : '儲存變更' }}</button>
      </div>
    </div>
    <form class="admin-editor-grid">
      <main>
        <section class="admin-card editor-card">
          <h2>基本資訊</h2>
          <label
            >商品名稱<input name="name" [(ngModel)]="form.name" placeholder="輸入商品名稱" /></label
          ><label
            >商品簡介<textarea
              name="description"
              [(ngModel)]="form.description"
              rows="5"
              placeholder="說明特色、狀態與照護重點"
            ></textarea
            ><small>建議 80–160 字，讓顧客快速理解商品。</small></label
          >
          <div class="editor-two">
            <label
              >學名／英文名<input name="scientificName" [(ngModel)]="form.scientificName" /></label
            ><label
              >商品分類<select name="category" [(ngModel)]="form.category">
                <option value="">請選擇</option>
                @for (category of store.categories(); track category.id) {
                  <option [value]="category.slug">{{ category.name }}</option>
                }
              </select></label
            >
          </div>
        </section>
        <section class="admin-card editor-card">
          <h2>商品圖片</h2>
          <div class="upload-zone">
            <span>↥</span><b>拖曳圖片到這裡，或點擊選擇檔案</b
            ><small>建議 1200 × 1200px，JPG、PNG 或 WebP，單檔不超過 5MB</small
            ><button type="button">選擇圖片</button>
          </div>
        </section>
        <section class="admin-card editor-card">
          <h2>價格與庫存</h2>
          <div class="editor-three">
            <label>會員售價<input name="price" [(ngModel)]="form.price" type="number" /></label
            ><label
              >原價<input
                name="comparePrice"
                [(ngModel)]="form.comparePrice"
                type="number" /></label
            ><label>庫存數量<input name="stock" [(ngModel)]="form.stock" type="number" /></label>
          </div>
          <div class="editor-two">
            <label>SKU<input name="sku" [(ngModel)]="form.sku" /></label
            ><label
              >庫存警示值<input name="lowStock" [(ngModel)]="form.lowStock" type="number"
            /></label>
          </div>
        </section>
        <section class="admin-card editor-card">
          <h2>照護資訊</h2>
          <div class="editor-three">
            <label
              >照護難度<select name="care">
                <option>入門</option>
                <option>中等</option>
                <option>進階</option>
              </select></label
            ><label>商品尺寸<input name="size" placeholder="例如 3–4 cm" /></label
            ><label>建議水溫<input name="temperature" placeholder="例如 24–28°C" /></label>
          </div>
        </section>
      </main>
      <aside>
        <section class="admin-card editor-card">
          <h2>發布狀態</h2>
          <label
            >商品狀態<select name="status">
              <option>上架中</option>
              <option>草稿</option>
              <option>已下架</option>
            </select></label
          ><label class="switch-row"
            ><span><b>會員限定價格</b><small>未登入時隱藏售價</small></span
            ><input type="checkbox" checked /></label
          ><label class="switch-row"
            ><span><b>首頁精選</b><small>顯示於首頁精選區</small></span
            ><input type="checkbox"
          /></label>
        </section>
        <section class="admin-card editor-card">
          <h2>搜尋與網址</h2>
          <label>網址代稱<input name="slug" [(ngModel)]="form.slug" /></label
          ><label>SEO 標題<input name="seo" placeholder="留白則使用商品名稱" /></label>
        </section>
        <section class="admin-card editor-card danger-zone">
          <h2>危險操作</h2>
          <p>刪除後無法復原，歷史訂單仍會保留商品快照。</p>
          <button type="button">刪除商品</button>
        </section>
      </aside>
    </form>`,
})
export class AdminProductEditorPageComponent {
  readonly store = inject(StoreService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly isNew = !this.id;
  private readonly product = this.store.products().find((item) => item.id === Number(this.id));
  form = {
    name: this.product?.name ?? '',
    description: this.product?.description ?? '',
    scientificName: this.product?.scientificName ?? '',
    category: this.product?.categorySlug ?? '',
    price: this.product?.price ?? 0,
    comparePrice: this.product?.compareAtPrice ?? 0,
    stock: this.product?.stock ?? 0,
    sku: this.product ? `LF-${this.product.id.toString().padStart(4, '0')}` : '',
    lowStock: 5,
    slug: this.product?.slug ?? '',
  };
}
