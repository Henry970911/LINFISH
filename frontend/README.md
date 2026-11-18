# LINFISH Frontend

Angular 商城前端原型，已建立公開商城、會員流程、購物車／結帳、內容頁面與管理後台。

## 開發指令

```bash
npm install
npm start
npm run build
npm test
```

本機網址：`http://localhost:4200`

## 主要路由

### 商城前台

- `/`：首頁
- `/catalog`：商品列表、搜尋與分類
- `/product/:slug`：商品詳情
- `/cart`：購物車
- `/checkout`：填寫訂單資料
- `/order-complete`：訂單完成
- `/guides`、`/guides/:slug`：水族文章
- `/info/about`、`/info/shipping`、`/info/returns`、`/info/vip`：資訊頁
- `/contact`：聯絡頁面

### 會員

- `/login`、`/register`、`/forgot-password`
- `/account`、`/account/orders`、`/account/profile`、`/account/favorites`

### 管理後台

- `/admin`：儀表板
- `/admin/products`、`/admin/products/new`、`/admin/products/:id`
- `/admin/categories`
- `/admin/orders`、`/admin/orders/:id`
- `/admin/customers`
- `/admin/content`
- `/admin/settings`

## 目錄責任

```text
src/app/
├─ core/
│  ├─ config/       API 路徑等全域設定
│  ├─ data/         原型用 Mock Data
│  ├─ models/       TypeScript 資料模型
│  └─ services/     跨頁狀態與未來 HTTP Service
├─ features/
│  ├─ home/         首頁
│  ├─ catalog/      商品列表與詳情
│  ├─ cart/         購物車、結帳、完成頁
│  ├─ auth/         登入、註冊、忘記密碼
│  ├─ account/      會員中心
│  ├─ content/      文章、資訊與聯絡頁
│  ├─ admin/        管理後台
│  └─ system/       404 等系統頁
├─ layouts/         前台與後台外框
└─ shared/          可重用畫面元件
```

## 串接後端的替換點

目前資料集中在 `core/data/mock-store.data.ts`，互動狀態位於 `core/services/store.service.ts`。

串接 ASP.NET Core API 時：

1. 在 `environments/environment.ts` 設定 API URL。
2. 將 `StoreService` 的 Mock Data 改為 Angular `HttpClient` 呼叫。
3. 建立 Auth Service 與 HTTP Interceptor，自動附加 Supabase JWT。
4. 保留現有 models，依 API DTO 調整欄位即可。
5. 管理後台加上 Admin Guard；後端仍需再次驗證管理員角色。

## Cloudflare Pages

`public/_redirects` 已處理 Angular SPA 深層路由。部署時執行：

```bash
npm run build
```

依 Angular 版本將 Cloudflare Pages 的輸出目錄設定為 `dist/linfish-web/browser`。

