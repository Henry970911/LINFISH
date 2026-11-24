/*
 * 驗證信 callback 元件依目前會員流程完整停用。
 *
 * 舊版元件會讀取 Email callback URL、交換 Supabase session，
 * 再導向會員中心。現在註冊成功就直接取得 session 並建立 ogcusr，
 * 因此這個檔案只保留停用說明，不會被 app.routes.ts 載入或執行。
 */
