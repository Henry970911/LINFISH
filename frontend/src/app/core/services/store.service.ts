import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CATALOG_FILTER_GROUPS, CATEGORIES } from '../data/mock-store.data';
import { CartItem, Product } from '../models/store.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private loadGeneration = 0;

  readonly categories = computed(() => CATEGORIES.map(category => ({...category,itemCount:this.products().filter(p=>p.groupSlug===category.slug).length})));
  readonly catalogFilterGroups = computed(() => CATALOG_FILTER_GROUPS.map(group => ({...group,itemCount:this.products().filter(p=>p.groupSlug===group.slug).length,options:group.options.map(option=>({...option,itemCount:this.products().filter(p=>p.groupSlug===group.slug && p.subcategorySlug===option.slug).length}))})));
  readonly products = signal<Product[]>([]);
  readonly orders = signal<import('../models/store.models').OrderSummary[]>([]);
  readonly cart = signal<CartItem[]>([]);
  readonly catalogError = signal('');
  // 會員狀態直接連結真實登入 session，不再使用 demo 帳號狀態。
  readonly isMember = this.authService.isAuthenticated;

  readonly featuredProducts = computed(() => this.products().filter((item) => item.featured));
  readonly newProducts = computed(() => this.products().filter((item) => item.isNew));
  readonly cartCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  readonly cartSubtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );
  readonly shippingFee = computed(() => (this.cartSubtotal() >= 1200 ? 0 : 120));
  readonly cartTotal = computed(() => this.cartSubtotal() + this.shippingFee());

  constructor() { effect(() => { if (!this.isMember()) this.clearCart(); void this.loadCatalog(); }); }

  async loadCatalog(): Promise<void> {
    const generation = ++this.loadGeneration;
    try {
      const items = await firstValueFrom(this.http.get<Array<{id:number;productNo:string;productName:string;description:string;proNo:string;categoryNo:string;categoryName:string;image:string|null;images:string[];videoUrl:string|null;variationName:string|null;totalStock:number;inventoryUnit:string;skus:NonNullable<Product['skus']>}>>(`${environment.apiBaseUrl}/catalog/products`));
      if (generation !== this.loadGeneration) return;
      const groupMap: Record<string,string> = {FISI:'fish',AQUI:'equipment',FEEI:'food'};
      this.products.set(items.map(p => { const group=groupMap[p.proNo] ?? ''; const index=Number(p.categoryNo.slice(4)); const option=CATALOG_FILTER_GROUPS.find(g=>g.slug===group)?.options[index]; const prices=p.skus.flatMap(s=>s.price===null?[]:[s.price]); return {id:p.id,slug:String(p.id),name:p.productName,categorySlug:group,groupSlug:group,subcategorySlug:option?.slug ?? p.categoryNo,price:prices.length ? Math.min(...prices) : 0,emoji:'🐠',gradient:'#edf5f1',description:p.description,careLevel:'入門',size:'',temperature:'',stock:p.totalStock,inventoryUnit:p.inventoryUnit,image:p.image,images:p.images,videoUrl:p.videoUrl,variationName:p.variationName,skus:p.skus} satisfies Product; }));
      this.catalogError.set('');
    } catch { if(generation===this.loadGeneration) { this.products.set([]); this.catalogError.set('商品資料無法載入，請稍後再試。'); } }
  }

  productBySlug(slug: string | null): Product | undefined {
    return this.products().find((item) => item.slug === slug);
  }

  productsByCategory(categorySlug: string | null): Product[] {
    if (!categorySlug || categorySlug === 'all') return this.products();
    return this.products().filter((item) => item.categorySlug === categorySlug);
  }

  addToCart(product: Product, quantity = 1): void {
    if (!this.isMember() || !product.skuId || quantity < 1 || quantity > product.stock) return;
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.skuId === product.skuId);
      if (existing) {
        return items.map((item) =>
          item.product.skuId === product.skuId ? { ...item, quantity: Math.min(product.stock,item.quantity + quantity) } : item,
        );
      }
      return [...items, { product, quantity }];
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) return this.removeFromCart(productId);
    this.cart.update((items) =>
      items.map((item) => (item.product.skuId === productId ? { ...item, quantity: Math.min(quantity,item.product.stock) } : item)),
    );
  }

  removeFromCart(productId: number): void {
    this.cart.update((items) => items.filter((item) => item.product.skuId !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

}
