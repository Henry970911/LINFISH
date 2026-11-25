// 訂單狀態與後端目前支援的流程保持一致。
export function orderStatusName(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '待處理',
    PROCESSING: '處理中',
    SHIPPED: '已出貨',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };
  return labels[status] ?? status;
}
