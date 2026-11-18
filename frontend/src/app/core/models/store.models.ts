export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description: string;
  accent: string;
  itemCount: number;
}

export interface CatalogFilterOption {
  slug: string;
  name: string;
  itemCount: number;
}

export interface CatalogFilterGroup {
  slug: string;
  name: string;
  itemCount: number;
  description: string;
  options: CatalogFilterOption[];
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  scientificName?: string;
  categorySlug: string;
  groupSlug: string;
  subcategorySlug: string;
  price: number;
  compareAtPrice?: number;
  badge?: string;
  emoji: string;
  gradient: string;
  description: string;
  careLevel: '入門' | '中等' | '進階';
  size: string;
  temperature: string;
  stock: number;
  featured?: boolean;
  isNew?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  date: string;
  status: '待付款' | '處理中' | '已出貨' | '已完成';
  total: number;
  itemCount: number;
}

