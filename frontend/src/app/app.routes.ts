import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { StoreLayoutComponent } from './layouts/store-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: StoreLayoutComponent,
    children: [
      {
        path: '',
        title: 'LINFISH｜讓水族生活更簡單',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'catalog',
        title: '商品列表｜LINFISH',
        loadComponent: () =>
          import('./features/catalog/catalog.page').then((m) => m.CatalogPageComponent),
      },
      {
        path: 'product/:slug',
        title: '商品資訊｜LINFISH',
        loadComponent: () =>
          import('./features/catalog/product-detail.page').then(
            (m) => m.ProductDetailPageComponent,
          ),
      },
      {
        path: 'cart',
        title: '購物車｜LINFISH',
        loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPageComponent),
      },
      {
        path: 'checkout',
        title: '結帳｜LINFISH',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cart/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'order-complete',
        title: '訂單完成｜LINFISH',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cart/order-complete.page').then((m) => m.OrderCompletePageComponent),
      },
      {
        path: 'account',
        title: '會員中心｜LINFISH',
        canActivate: [authGuard],
        data: { section: 'overview' },
        loadComponent: () =>
          import('./features/account/account.page').then((m) => m.AccountPageComponent),
      },
      {
        path: 'account/orders',
        title: '訂單紀錄｜LINFISH',
        canActivate: [authGuard],
        data: { section: 'orders' },
        loadComponent: () =>
          import('./features/account/account.page').then((m) => m.AccountPageComponent),
      },
      {
        path: 'account/orders/:id',
        title: '訂單詳情｜LINFISH',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/account/order-detail.page').then((m) => m.OrderDetailPageComponent),
      },
      {
        path: 'account/profile',
        title: '個人資料｜LINFISH',
        canActivate: [authGuard],
        data: { section: 'profile' },
        loadComponent: () =>
          import('./features/account/account.page').then((m) => m.AccountPageComponent),
      },
      {
        path: 'account/favorites',
        title: '收藏清單｜LINFISH',
        canActivate: [authGuard],
        data: { section: 'favorites' },
        loadComponent: () =>
          import('./features/account/account.page').then((m) => m.AccountPageComponent),
      },
      {
        path: 'guides',
        title: '水族小教室｜LINFISH',
        loadComponent: () =>
          import('./features/content/guides.page').then((m) => m.GuidesPageComponent),
      },
      {
        path: 'guides/:slug',
        title: '水族文章｜LINFISH',
        loadComponent: () =>
          import('./features/content/guide-detail.page').then((m) => m.GuideDetailPageComponent),
      },
      {
        path: 'contact',
        title: '聯絡我們｜LINFISH',
        loadComponent: () =>
          import('./features/content/contact.page').then((m) => m.ContactPageComponent),
      },
      {
        path: 'info/about',
        title: '關於我們｜LINFISH',
        data: {
          kind: 'about',
          eyebrow: 'ABOUT LINFISH',
          title: '把喜歡變成能長久照顧的日常',
          intro: '不只提供商品，也提供做出適合選擇所需要的資訊。',
          symbol: '∞',
        },
        loadComponent: () =>
          import('./features/content/info.page').then((m) => m.InfoPageComponent),
      },
      {
        path: 'info/shipping',
        title: '付款與配送｜LINFISH',
        data: {
          kind: 'shipping',
          eyebrow: 'SHOPPING GUIDE',
          title: '付款與配送方式',
          intro: '從下單到收貨，每一個環節都先說清楚。',
          symbol: '→',
        },
        loadComponent: () =>
          import('./features/content/info.page').then((m) => m.InfoPageComponent),
      },
      {
        path: 'info/returns',
        title: '到貨與售後｜LINFISH',
        data: {
          kind: 'returns',
          eyebrow: 'AFTER SALES',
          title: '到貨與售後協助',
          intro: '收到商品後的檢查、對水與異常處理方式。',
          symbol: '✓',
        },
        loadComponent: () =>
          import('./features/content/info.page').then((m) => m.InfoPageComponent),
      },
      {
        path: 'info/vip',
        title: '會員權益｜LINFISH',
        data: {
          kind: 'vip',
          eyebrow: 'MEMBERSHIP',
          title: '會員分級與權益',
          intro: '讓每一次消費都累積成更完整的服務。',
          symbol: '◎',
        },
        loadComponent: () =>
          import('./features/content/info.page').then((m) => m.InfoPageComponent),
      },
    ],
  },
  {
    path: 'login',
    title: '會員登入｜LINFISH',
    data: { mode: 'login' },
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPageComponent),
  },
  {
    path: 'register',
    title: '免費註冊｜LINFISH',
    data: { mode: 'register' },
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPageComponent),
  },
  {
    path: 'forgot-password',
    title: '忘記密碼｜LINFISH',
    data: { mode: 'forgot' },
    loadComponent: () => import('./features/auth/auth.page').then((m) => m.AuthPageComponent),
  },
  // 會員註冊／登入只使用本站後端 API，不設 Email callback route。
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        title: '管理儀表板｜LINFISH',
        loadComponent: () =>
          import('./features/admin/admin-dashboard.page').then(
            (m) => m.AdminDashboardPageComponent,
          ),
      },
      {
        path: 'products',
        title: '商品管理｜LINFISH',
        data: {
          eyebrow: 'PRODUCT OPERATIONS',
          title: '商品管理',
          description: '規劃商品主檔、分類、價格與上下架流程。',
          items: ['商品主檔', '分類與標籤', '價格與上下架'],
        },
        loadComponent: () =>
          import('./features/admin/admin-commerce.page').then((m) => m.AdminCommercePageComponent),
      },
      {
        path: 'members',
        title: '會員管理｜LINFISH',
        data: {
          eyebrow: 'MEMBER OPERATIONS',
          title: '會員管理',
          description: '管理會員資料、等級與帳號使用狀態。',
          items: ['會員清單', 'VIP／Regular 等級', '帳號狀態'],
        },
        loadComponent: () =>
          import('./features/admin/admin-module.page').then((m) => m.AdminModulePageComponent),
      },
      {
        path: 'orders',
        title: '訂單管理｜LINFISH',
        loadComponent: () => import('./features/admin/admin-orders.page').then((m) => m.AdminOrdersPageComponent),
      },
      { path:'settings', title:'稅別與物流設定｜LINFISH', loadComponent:()=>import('./features/admin/commerce-settings.page').then(m=>m.CommerceSettingsPageComponent) },
      {
        path: 'finance',
        title: '財務管理｜LINFISH',
        data: {
          eyebrow: 'FINANCE OPERATIONS',
          title: '財務管理',
          description: '規劃收支、付款對帳與營運報表。',
          items: ['收支紀錄', '付款與對帳', '財務報表'],
        },
        loadComponent: () =>
          import('./features/admin/admin-module.page').then((m) => m.AdminModulePageComponent),
      },
      {
        path: 'warehouse',
        title: '倉儲管理｜LINFISH',
        data: {
          eyebrow: 'WAREHOUSE OPERATIONS',
          title: '倉儲管理',
          description: '規劃庫存、入出庫與庫存預警流程。',
          items: ['即時庫存', '入庫與出庫', '低庫存提醒'],
        },
        loadComponent: () =>
          import('./features/admin/admin-module.page').then((m) => m.AdminModulePageComponent),
      },
    ],
  },
  {
    path: '**',
    title: '找不到頁面｜LINFISH',
    loadComponent: () =>
      import('./features/system/not-found.page').then((m) => m.NotFoundPageComponent),
  },
];
