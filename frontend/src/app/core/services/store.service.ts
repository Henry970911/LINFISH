import { Injectable, computed, signal } from '@angular/core';
import { CATALOG_FILTER_GROUPS, CATEGORIES, ORDERS, PRODUCTS } from '../data/mock-store.data';
import { CartItem, Product } from '../models/store.models';

@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly categories = signal(CATEGORIES);
  readonly catalogFilterGroups = signal(CATALOG_FILTER_GROUPS);
  readonly products = signal(PRODUCTS);
  readonly orders = signal(ORDERS);
  readonly cart = signal<CartItem[]>([
    { product: PRODUCTS[1], quantity: 1 },
    { product: PRODUCTS[4], quantity: 1 },
  ]);
  readonly isMember = signal(false);

  readonly featuredProducts = computed(() => this.products().filter((item) => item.featured));
  readonly newProducts = computed(() => this.products().filter((item) => item.isNew));
  readonly cartCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  readonly cartSubtotal = computed(() => this.cart().reduce((sum, item) => sum + item.product.price * item.quantity, 0));
  readonly shippingFee = computed(() => (this.cartSubtotal() >= 1200 ? 0 : 120));
  readonly cartTotal = computed(() => this.cartSubtotal() + this.shippingFee());

  productBySlug(slug: string | null): Product | undefined {
    return this.products().find((item) => item.slug === slug);
  }

  productsByCategory(categorySlug: string | null): Product[] {
    if (!categorySlug || categorySlug === 'all') return this.products();
    return this.products().filter((item) => item.categorySlug === categorySlug);
  }

  addToCart(product: Product, quantity = 1): void {
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...items, { product, quantity }];
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) return this.removeFromCart(productId);
    this.cart.update((items) => items.map((item) => item.product.id === productId ? { ...item, quantity } : item));
  }

  removeFromCart(productId: number): void {
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  loginDemo(): void {
    this.isMember.set(true);
  }

  logoutDemo(): void {
    this.isMember.set(false);
  }
}

