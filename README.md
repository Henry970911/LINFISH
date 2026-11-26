# LINFISH 魚軒水族商城

會員制水族商城與營運管理系統。此文件反映 2026-11-23 的專案狀態。

## 專案結構

- `frontend/`：Angular 商城、會員及管理介面。
- `LinfishAppcation/LinfishAppcation/`：ASP.NET Core API。
- `docs/`：資料表 SQL、架構與操作說明。SQL 為不同時間的歷史遷移紀錄，執行前請先核對環境與執行狀態。

## 本機啟動

1. 於後端專案使用 .NET User Secrets 設定 `ConnectionStrings:DefaultConnection` 與 `Auth:JwtKey`，其他登入設定請依專案設定檔及部署環境準備。不可將密碼、API 金鑰或連線字串寫入程式庫。
2. 在 Visual Studio 開啟並啟動 `LinfishAppcation/LinfishAppcation/LinfishAppcation.csproj`；本機 HTTP 預設為 `http://localhost:5190`。
3. 在 `frontend/` 執行 `npm install`、`npm start`，瀏覽 `http://localhost:4200`。前端 API 位址位於 `frontend/src/environments/environment.ts`。
4. 驗證可執行 `dotnet build`、`npm run build`、`npm test -- --watch=false`。

## 已串接的流程

- 會員登入後顯示商品價格，可選擇規格、加入購物車、建立並查看自己的訂單。
- 管理者管理商品、規格、圖片、稅別、物流、訂單與售後紀錄。商品、規格和稅別需符合上架條件；已出現在訂單中的商品只能下架。
- 未付款訂單可取消並回補庫存；付款由管理者人工確認，已付款訂單不能取消，未付款不可出貨。退貨及部分退款透過售後紀錄人工處理。
- 圖片上傳接受 JPG／PNG，後端轉換 WebP，儲存在 PostgreSQL `cmepms.product_image_data`。商品及規格資料保存圖片識別路徑；新上傳不需要 Supabase Storage Bucket。
- 管理者設定稅率、含稅方式、混合結帳限制及物流；商品需選擇啟用的稅別。物流預設常溫宅配 120 元、滿 1,200 元免運，仍以後台實際設定為準。

## 文件

- [管理及資料庫操作說明](docs/admin-commerce-setup.md)
- [前端架構](docs/frontend-architecture.md)
- [前端指令與路由](frontend/README.md)
- [2026-11-23 資料表變動紀錄](docs/LINFISH_2026-11-23_資料表變動.docx)

正式營運前應以獨立測試環境驗證權限、付款與稅務規則、並行庫存、還原與部署安全；目前付款和退款均為人工紀錄，沒有串接金流。
