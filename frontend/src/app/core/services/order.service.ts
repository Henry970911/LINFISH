import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface OrderSummary { id: number; orderNo: string; total: number; orderedAt: string; customerNo: string; customerName: string; isPaid: boolean; stat: string | null }
// 2026-11-27：訂單明細與 API 增加轉帳後四碼及提交時間。
export interface OrderDetail { order: OrderSummary & { subtotal: number; shipping: number; discount: number; recipientName: string; recipientPhone: string; shippingAddress: string; taxAmount: number; shippingMethodName: string | null; transferLastFour: string | null; transferReportedAt: string | null; trackingNumber: string | null; shippedAt: string | null }; items: { id: number; productName: string; skuName: string; skuNo: string; unitPrice: number; quantity: number; unitsPerSale: number; amount: number; taxName: string | null; taxRate: number | null; priceIncludesTax: boolean | null; taxAmount: number | null }[] }
export interface AfterSale { id: number; reason: string; status: string; refundAmount: number; createdAt: string; createdBy: string; receivedAt: string | null; receivedBy: string | null; refundedAt: string | null; refundedBy: string | null; items: { id: number; orderItemId: number; quantity: number; restockedAt: string | null; productName: string; skuName: string }[] }
export interface OrderStats { totalOrders: number; pendingPayment: number; pendingVerification: number; cancelled: number; paidOrders: number; totalAmount: number; paidAmount: number; cancelledAmount: number; refundedAmount: number }
@Injectable({ providedIn: 'root' })
export class OrderService {
    private http = inject(HttpClient); private base = `${environment.apiBaseUrl}/orders`;
    mine() { return firstValueFrom(this.http.get<OrderSummary[]>(this.base)); }
    admin() { return firstValueFrom(this.http.get<OrderSummary[]>(`${this.base}/admin`)); }
    stats() { return firstValueFrom(this.http.get<OrderStats>(`${this.base}/admin/stats`)); }
    detail(id: number) { return firstValueFrom(this.http.get<OrderDetail>(`${this.base}/${id}`)); }
    reportTransfer(id: number, lastFour: string) { return firstValueFrom(this.http.post<void>(`${this.base}/${id}/transfer-report`, { lastFour })); }
    // 2026-11-27：管理員將核對失敗的訂單退回待付款。
    rejectTransfer(id: number) { return firstValueFrom(this.http.post<void>(`${this.base}/${id}/reject-transfer`, {})); }
    // 2026-11-27：管理員記錄黑貓單號並確認出貨。
    recordShipment(id: number, trackingNumber: string) { return firstValueFrom(this.http.post<void>(this.base + '/' + id + '/shipment', { trackingNumber })); }
    // 2026-11-27：顧客或管理員確認送達並完成訂單。
    complete(id: number) { return firstValueFrom(this.http.post<void>(this.base + '/' + id + '/complete', {})); }
    confirmPayment(id: number) { return firstValueFrom(this.http.post<void>(`${this.base}/${id}/confirm-payment`, {})); }
    cancel(id: number) { return firstValueFrom(this.http.post<void>(`${this.base}/${id}/cancel`, {})); }
    deleteOrder(id: number) { return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`)); }
    afterSales(id: number) { return firstValueFrom(this.http.get<AfterSale[]>(`${environment.apiBaseUrl}/admin/after-sales/order/${id}`)); }
    createAfterSale(orderId: number, reason: string, refundAmount: number, items: { orderItemId: number; quantity: number }[]) { return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/admin/after-sales`, { orderId, reason, refundAmount, items })); }
    afterSaleStatus(id: number, status: string) { return firstValueFrom(this.http.put<void>(`${environment.apiBaseUrl}/admin/after-sales/${id}/status`, { status })); }
    restockAfterSale(id: number, itemId: number) { return firstValueFrom(this.http.post<void>(`${environment.apiBaseUrl}/admin/after-sales/${id}/items/${itemId}/restock`, {})); }
}
