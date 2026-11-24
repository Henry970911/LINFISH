# 前端開發

Angular 前端位於 `frontend/`，本機 API 位址為 `src/environments/environment.ts`。

```powershell
npm install
npm start
npm run build
npm test -- --watch=false
```

預設開啟 `http://localhost:4200`，並需啟動 ASP.NET Core 後端。

主要路由：商城 `/catalog`、商品 `/product/:slug`、購物車 `/cart`、結帳 `/checkout`、會員 `/account`、訂單 `/account/orders`；管理後台 `/admin/products`、`/admin/orders`、`/admin/settings`。帳號及密碼不可寫入專案或文件。詳細功能與設定參考根目錄 [README](../README.md)。
