# 前端架構與後續擴充

## 設計原則

- `features` 依業務領域分頁，避免所有頁面堆在同一個 components 資料夾。
- `core` 只存放全站單例資料、模型與設定。
- `shared` 只放可跨功能重用的 UI 元件。
- 前台與管理後台各自使用 Layout，未來可以分開調整導覽或權限。
- 頁面使用 lazy loading，新增功能不會讓初始 bundle 無限制成長。

## 建議新增功能的位置

| 功能 | 建議位置 |
| --- | --- |
| 優惠券 | `features/cart/` + `core/models/` |
| 商品評論 | `features/catalog/` |
| 願望清單 | `features/account/` + `core/services/` |
| 管理員權限 | `core/guards/` + `features/admin/` |
| API JWT | `core/interceptors/` |
| Supabase Auth | `core/services/auth.service.ts` |
| 圖片上傳 | `features/admin/` + Storage service |

## API 串接順序

1. `GET /api/categories`
2. `GET /api/products`
3. `GET /api/products/{slug}`
4. Supabase Auth 與 JWT interceptor
5. `POST /api/orders`
6. 會員訂單與資料
7. 管理後台 CRUD

所有價格、庫存、訂單總額與管理員權限都必須由 API 再次驗證，不能只依賴前端狀態。

