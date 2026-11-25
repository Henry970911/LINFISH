import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface OrderSummary { id: number; orderNo: string; status: string; total: number; orderedAt: string; customerNo: string; customerName: string; isPaid: boolean }
export interface OrderDetail { order: OrderSummary & { subtotal: number; shipping: number; discount: number; recipientName: string; recipientPhone: string; shippingAddress: string; taxAmount: number; shippingMethodName: string | null }; items: { id: number; productName: string; skuName: string; skuNo: string; unitPrice: number; quantity: number; unitsPerSale: number; amount: number; taxName: string | null; taxRate: number | null; priceIncludesTax: boolean | null; taxAmount: number | null }[] }
export interface AfterSale { id: number; reason: string; status: string; refundAmount: number; createdAt: string; createdBy: string; receivedAt: string | null; receivedBy: string | null; refundedAt: string | null; refundedBy: string | null; items: { id: number; orderItemId: number; quantity: number; restockedAt: string | null; productName: string; skuName: string }[] }
export interface OrderStats { totalOrders: number; pendingPayment: number; pendingShipment: number; shipped: number; cancelled: number; paidOrders: number; totalAmount: number; paidAmount: number; cancelledAmount: number; refundedAmount: number }
@Injectable({ providedIn: 'root' })
export class OrderService {
    private http = inject(HttpClient); private base = `${environment.apiBaseUrl}/orders`;
    mine() { return firstValueFrom(this.http.get<OrderSummary[]>(this.base)); }
    admin() { return firstValueFrom(this.http.get<OrderSummary[]>(`${this.base}/admin`)); }
    stats() { return firstValueFrom(this.http.get<OrderStats>(`${this.base}/admin/stats`)); }
    detail(id: number) { return firstValueFrom(this.http.get<OrderDetail>(`${this.base}/${id}`)); }
    status(id: number, status: string) { return firstValueFrom(this.http.put<void>(`${this.base}/${id}/status`, { status })); }
    confirmPayment(id: number) { return firstValueFrom(this.http.post<void>(`${this.base}/${id}/confirm-payment`, {})); }
    cancel(id: number) { return firstValueFrom(this.http.post<void>(`${this.base}/${id}/cancel`, {})); }
    afterSales(id: number) { return firstValueFrom(this.http.get<AfterSale[]>(`${environment.apiBaseUrl}/admin/after-sales/order/${id}`)); }
    createAfterSale(orderId: number, reason: string, refundAmount: number, items: { orderItemId: number; quantity: number }[]) { return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/admin/after-sales`, { orderId, reason, refundAmount, items })); }
    afterSaleStatus(id: number, status: string) { return firstValueFrom(this.http.put<void>(`${environment.apiBaseUrl}/admin/after-sales/${id}/status`, { status })); }
    restockAfterSale(id: number, itemId: number) { return firstValueFrom(this.http.post<void>(`${environment.apiBaseUrl}/admin/after-sales/${id}/items/${itemId}/restock`, {})); }
}
