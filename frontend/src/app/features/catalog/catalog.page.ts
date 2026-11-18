import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  template: `
    <section class="page-hero page-hero--catalog">
      <div class="container">
        <div><span class="eyebrow">ONLINE SHOP</span><h1>{{ pageTitle() }}</h1><p>{{ pageDescription() }}</p></div>
        <span class="page-hero__number">{{ filteredProducts().length.toString().padStart(2, '0') }}</span>
      </div>
    </section>

    <div class="container catalog-layout">
      <aside class="catalog-sidebar">
        <nav class="catalog-filter-panel" aria-label="商品分類">
          <button
            class="all-products-filter"
            [class.active]="selectedGroup() === null"
            type="button"
            (click)="selectAllProducts()"
          >
            <span>全部商品</span>
            <small>{{ store.products().length }}</small>
          </button>

          @for (group of store.catalogFilterGroups(); track group.slug) {
            <section class="filter-group" [class.filter-group--open]="expandedGroup() === group.slug">
              <button
                class="filter-group__trigger"
                type="button"
                [attr.aria-expanded]="expandedGroup() === group.slug"
                [attr.aria-controls]="'filter-options-' + group.slug"
                (click)="toggleGroup(group.slug)"
              >
                <span>{{ group.name }}</span>
                <i aria-hidden="true"></i>
              </button>

              @if (expandedGroup() === group.slug) {
                <div class="filter-options" [id]="'filter-options-' + group.slug">
                  <button
                    class="filter-option"
                    [class.active]="selectedGroup() === group.slug && selectedSubcategory() === 'all'"
                    type="button"
                    (click)="selectSubcategory(group.slug, 'all')"
                  >
                    <span class="filter-check"></span>
                    <span>全部 ({{ group.itemCount }})</span>
                  </button>

                  @for (option of group.options; track option.slug) {
                    <button
                      class="filter-option"
                      [class.active]="selectedGroup() === group.slug && selectedSubcategory() === option.slug"
                      type="button"
                      (click)="selectSubcategory(group.slug, option.slug)"
                    >
                      <span class="filter-check"></span>
                      <span>{{ option.name }} ({{ option.itemCount }})</span>
                    </button>
                  }
                </div>
              }
            </section>
          }
        </nav>

        <div class="sidebar-help">
          <span>？</span><h3>不知道怎麼選？</h3>
          <p>告訴我們魚缸尺寸與現有魚種，客服會協助建議。</p>
          <a routerLink="/contact">詢問客服 →</a>
        </div>
      </aside>

      <section class="catalog-main">
        <div class="catalog-toolbar">
          <p>顯示 <b>{{ filteredProducts().length }}</b> 件商品 @if (keyword()) { · 搜尋「{{ keyword() }}」 }</p>
          <label>排序<select><option>最新上架</option><option>熱門程度</option><option>價格低至高</option><option>價格高至低</option></select></label>
        </div>

        @if (filteredProducts().length) {
          <div class="product-grid product-grid--catalog">
            @for (product of filteredProducts(); track product.id) { <app-product-card [product]="product" /> }
          </div>
        } @else {
          <div class="empty-state"><span>⌕</span><h2>這個分類目前沒有展示商品</h2><p>分類結構已建立，之後可從管理後台加入商品。</p><button class="btn btn--dark" type="button" (click)="reset()">查看全部商品</button></div>
        }
      </section>
    </div>
  `,
})
export class CatalogPageComponent {
  readonly store = inject(StoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly expandedGroup = signal<string | null>(null);
  readonly selectedGroup = signal<string | null>(null);
  readonly selectedSubcategory = signal('all');
  readonly keyword = signal('');
  readonly newOnly = signal(false);

  readonly filteredProducts = computed(() => {
    const term = this.keyword().toLowerCase();
    return this.store.products().filter((product) => {
      const matchesGroup = this.selectedGroup() === null || product.groupSlug === this.selectedGroup();
      const matchesSubcategory = this.selectedSubcategory() === 'all' || product.subcategorySlug === this.selectedSubcategory();
      const matchesKeyword = !term || `${product.name} ${product.scientificName ?? ''} ${product.description}`.toLowerCase().includes(term);
      const matchesView = !this.newOnly() || product.isNew;
      return matchesGroup && matchesSubcategory && matchesKeyword && matchesView;
    });
  });

  readonly pageTitle = computed(() => {
    if (this.newOnly()) return '本週新品';
    const group = this.store.catalogFilterGroups().find((item) => item.slug === this.selectedGroup());
    if (!group) return '全部商品';
    if (this.selectedSubcategory() === 'all') return group.name;
    return group.options.find((item) => item.slug === this.selectedSubcategory())?.name ?? group.name;
  });

  readonly pageDescription = computed(() => {
    const group = this.store.catalogFilterGroups().find((item) => item.slug === this.selectedGroup());
    return group?.description ?? '挑選適合你魚缸的生命與風景。';
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const legacySelection = this.mapLegacyCategory(params.get('category'));
      const group = params.get('group') ?? legacySelection.group;
      const subcategory = params.get('subcategory') ?? legacySelection.subcategory;

      this.selectedGroup.set(group);
      this.selectedSubcategory.set(group ? subcategory : 'all');
      this.expandedGroup.set(group);
      this.keyword.set(params.get('q') ?? '');
      this.newOnly.set(params.get('view') === 'new');
    });
  }

  toggleGroup(groupSlug: string): void {
    if (this.expandedGroup() === groupSlug) {
      this.expandedGroup.set(null);
      return;
    }

    this.navigateToFilter(groupSlug, 'all');
  }

  selectSubcategory(groupSlug: string, subcategorySlug: string): void {
    this.navigateToFilter(groupSlug, subcategorySlug);
  }

  selectAllProducts(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { group: null, subcategory: null, category: null },
      queryParamsHandling: 'merge',
    });
  }

  reset(): void {
    this.router.navigate(['/catalog']);
  }

  private navigateToFilter(groupSlug: string, subcategorySlug: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        group: groupSlug,
        subcategory: subcategorySlug === 'all' ? null : subcategorySlug,
        category: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private mapLegacyCategory(category: string | null): { group: string | null; subcategory: string } {
    const mapping: Record<string, { group: string; subcategory: string }> = {
      'tropical-fish': { group: 'fish', subcategory: 'all' },
      shrimp: { group: 'fish', subcategory: 'bottom-dwellers' },
      plants: { group: 'equipment', subcategory: 'equipment-other' },
      equipment: { group: 'equipment', subcategory: 'all' },
      aquascape: { group: 'equipment', subcategory: 'equipment-other' },
      food: { group: 'food', subcategory: 'all' },
    };

    return category && mapping[category] ? mapping[category] : { group: null, subcategory: 'all' };
  }
}
