import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { StoreLayoutComponent } from './layouts/store-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: StoreLayoutComponent,
    children: [
      { path: '', title: 'LINFISH｜讓水族生活更簡單', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePageComponent) },
      { path: 'catalog', title: '商品列表｜LINFISH', loadComponent: () => import('./features/catalog/catalog.page').then((m) => m.CatalogPageComponent) },
      { path: 'product/:slug', title: '商品資訊｜LINFISH', loadComponent: () => import('./features/catalog/product-detail.page').then((m) => m.ProductDetailPageComponent) },
      { path: 'cart', title: '購物車｜LINFISH', loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPageComponent) },
      { path: 'checkout', title: '結帳｜LINFISH', loadComponent: () => import('./features/cart/checkout.page').then((m) => m.CheckoutPageComponent) },
      { path: 'order-complete', title: '訂單完成｜LINFISH', loadComponent: () => import('./features/cart/order-complete.page').then((m) => m.OrderCompletePageComponent) },
      { path: 'account', title: '會員中心｜LINFISH', data: { section: 'overview' }, loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPageComponent) },
      { path: 'account/orders', title: '訂單紀錄｜LINFISH', data: { section: 'orders' }, loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPageComponent) },
      { path: 'account/orders/:id', title: '訂單詳情｜LINFISH', loadComponent: () => import('./features/account/order-detail.page').then((m) => m.OrderDetailPageComponent) },
      { path: 'account/profile', title: '個人資料｜LINFISH', data: { section: 'profile' }, loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPageComponent) },
      { path: 'account/favorites', title: '收藏清單｜LINFISH', data: { section: 'favorites' }, loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPageComponent) },
      { path: 'guides', title: '水族小教室｜LINFISH', loadComponent: () => import('./features/content/guides.page').then((m) => m.GuidesPageComponent) },
      { path: 'guides/:slug', title: '水族文章｜LINFISH', loadComponent: () => import('./features/content/guide-detail.page').then((m) => m.GuideDetailPageComponent) },
      { path: 'contact', title: '聯絡我們｜LINFISH', loadComponent: () => import('./features/content/contact.page').then((m) => m.ContactPageComponent) },
      { path: 'info/about', title: '關於我們｜LINFISH', data: { kind: 'about', eyebrow: 'ABOUT LINFISH', title: '把喜歡變成能長久照顧的日常', intro: '不只提供商品，也提供做出適合選擇所需要的資訊。', symbol: '∞' }, loadComponent: () => import('./features/content/info.page').then((m) => m.InfoPageComponent) },
      { path: 'info/shipping', title: '付款與配送｜LINFISH', data: { kind: 'shipping', eyebrow: 'SHOPPING GUIDE', title: '付款與配送方式', intro: '從下單到收貨，每一個環節都先說清楚。', symbol: '→' }, loadComponent: () => import('./features/content/info.page').then((m) => m.InfoPageComponent) },
      { path: 'info/returns', title: '到貨與售後｜LINFISH', data: { kind: 'returns', eyebrow: 'AFTER SALES', title: '到貨與售後協助', intro: '收到商品後的檢查、對水與異常處理方式。', symbol: '✓' }, loadComponent: () => import('./features/content/info.page').then((m) => m.InfoPageComponent) },
      { path: 'info/vip', title: '會員權益｜LINFISH', data: { kind: 'vip', eyebrow: 'MEMBERSHIP', title: '會員分級與權益', intro: '讓每一次消費都累積成更完整的服務。', symbol: '◎' }, loadComponent: () => import('./features/content/info.page').then((m) => m.InfoPageComponent) },
    ],
  },
  { path: 'login', title: '會員登入｜LINFISH', data: { mode: 'login' }, loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPageComponent) },
  { path: 'register', title: '免費註冊｜LINFISH', data: { mode: 'register' }, loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPageComponent) },
  { path: 'forgot-password', title: '忘記密碼｜LINFISH', data: { mode: 'forgot' }, loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPageComponent) },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', title: '管理儀表板｜LINFISH', loadComponent: () => import('./features/admin/admin-dashboard.page').then((m) => m.AdminDashboardPageComponent) },
      { path: 'products', title: '商品管理｜LINFISH', loadComponent: () => import('./features/admin/admin-products.page').then((m) => m.AdminProductsPageComponent) },
      { path: 'products/new', title: '新增商品｜LINFISH', loadComponent: () => import('./features/admin/admin-product-editor.page').then((m) => m.AdminProductEditorPageComponent) },
      { path: 'products/:id', title: '編輯商品｜LINFISH', loadComponent: () => import('./features/admin/admin-product-editor.page').then((m) => m.AdminProductEditorPageComponent) },
      { path: 'orders', title: '訂單管理｜LINFISH', loadComponent: () => import('./features/admin/admin-orders.page').then((m) => m.AdminOrdersPageComponent) },
      { path: 'orders/:id', title: '訂單詳情｜LINFISH', loadComponent: () => import('./features/admin/admin-order-detail.page').then((m) => m.AdminOrderDetailPageComponent) },
      { path: 'categories', title: '分類管理｜LINFISH', data: { eyebrow: '商品管理', title: '商品分類', description: '建立多層分類並調整前台顯示順序。', action: '新增分類', searchPlaceholder: '搜尋分類', items: [{ icon: '🐠', name: '觀賞魚', meta: '126 項商品 · 排序 1' }, { icon: '🦐', name: '觀賞蝦', meta: '28 項商品 · 排序 2' }, { icon: '🌿', name: '水草造景', meta: '42 項商品 · 排序 3' }] }, loadComponent: () => import('./features/admin/admin-generic.page').then((m) => m.AdminGenericPageComponent) },
      { path: 'customers', title: '會員管理｜LINFISH', data: { eyebrow: '訂單與會員', title: '會員管理', description: '查看會員資料、等級與消費紀錄。', action: '新增會員', searchPlaceholder: '姓名、Email 或手機', items: [{ icon: '林', name: '林小姐', meta: '一般會員 · 累積 NT$3,460' }, { icon: '陳', name: '陳先生', meta: 'VIP 會員 · 累積 NT$12,880' }, { icon: '王', name: '王小姐', meta: '一般會員 · 累積 NT$980' }] }, loadComponent: () => import('./features/admin/admin-generic.page').then((m) => m.AdminGenericPageComponent) },
      { path: 'content', title: '內容管理｜LINFISH', data: { eyebrow: '網站內容', title: 'Banner 與文章', description: '管理首頁活動、內容文章與發布狀態。', action: '新增內容', searchPlaceholder: '搜尋 Banner 或文章' }, loadComponent: () => import('./features/admin/admin-generic.page').then((m) => m.AdminGenericPageComponent) },
      { path: 'settings', title: '商店設定｜LINFISH', data: { eyebrow: '系統設定', title: '商店設定', description: '管理商店資料、配送、付款與通知設定。', action: '新增設定', searchPlaceholder: '搜尋設定', items: [{ icon: '⌂', name: '商店基本資料', meta: '名稱、聯絡方式與營業資訊' }, { icon: '🚚', name: '配送方式', meta: '宅配、運費與出貨日期' }, { icon: '▣', name: '付款方式', meta: 'ATM、信用卡與付款期限' }] }, loadComponent: () => import('./features/admin/admin-generic.page').then((m) => m.AdminGenericPageComponent) },
    ],
  },
  { path: '**', title: '找不到頁面｜LINFISH', loadComponent: () => import('./features/system/not-found.page').then((m) => m.NotFoundPageComponent) },
];

