// 2026-11-27：訂單狀態統一使用 stat，新增 20 核對中、30 已出貨及 40 已完成。 
export function orderStatusName(stat: string | null): string {
  return ({ '10': '待付款', '20': '核對中', '30': '已出貨', '40': '已完成', DD: '已付款', ZZ: '已取消' } as Record<string, string>)[stat ?? ''] ?? '狀態未設定';
}
