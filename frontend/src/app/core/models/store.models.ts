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
  image?: string | null;
  images?: string[];
  videoUrl?: string | null;
  variationName?: string | null;
  inventoryUnit?: string;
  skuId?: number;
  skuName?: string;
  skus?: { id: number; skuNo: string; skuName: string; price: number | null; stockQty: number; originalPrice: number | null; imageKey: string | null; inventoryId?: number; unitsPerSale?: number; attributes?: Record<string,string|number> }[];
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
