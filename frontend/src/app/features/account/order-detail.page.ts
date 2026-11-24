import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDetail, OrderService } from '../../core/services/order.service';

@Component({selector:'app-order-detail-page',standalone:true,imports:[CurrencyPipe,DatePipe,RouterLink],template:`
<section class="section"><div class="container narrow-page"><a routerLink="/account/orders">← 返回訂單紀錄</a>
@if(detail();as d){<h1>訂單 {{d.order.orderNo}}</h1><p>{{d.order.orderedAt | date:'yyyy/MM/dd HH:mm'}} · {{statusName(d.order.status)}} · {{d.order.isPaid ? '已付款' : '待付款'}}</p>
<section class="account-panel"><h2>商品明細</h2>@for(i of d.items;track i.id){<p>{{i.productName}} · {{i.skuName}} × {{i.quantity}}：{{i.amount | currency:'TWD':'NT$'}} @if(i.taxName){（{{i.taxName}} · {{i.priceIncludesTax?'含稅':'未稅加計'}}）}</p>}<p>商品小計 {{d.order.subtotal | currency:'TWD':'NT$'}}</p><p>稅額合計（含已包含於售價的稅額） {{d.order.taxAmount | currency:'TWD':'NT$'}}</p><p>{{d.order.shippingMethodName || '配送'}}運費 {{d.order.shipping | currency:'TWD':'NT$'}}</p><p>折扣 {{d.order.discount | currency:'TWD':'NT$'}}</p><b>合計 {{d.order.total | currency:'TWD':'NT$'}}</b></section>
<section class="account-panel"><h2>收件資料</h2><p>{{d.order.recipientName}} · {{d.order.recipientPhone}}</p><p>{{d.order.shippingAddress}}</p></section>
@if(!d.order.isPaid && (d.order.status === 'PENDING' || d.order.status === 'PROCESSING')){<button class="btn btn--dark" type="button" [disabled]="busy()" (click)="cancel(d.order.id)">取消訂單</button>}@else if(d.order.isPaid){<p>訂單已付款，如需售後協助請聯絡管理員。</p>}
<p role="status">{{message()}}</p>
}@else{<p>{{message()}}</p>}</div></section>`})
export class OrderDetailPageComponent {
 private route=inject(ActivatedRoute);private service=inject(OrderService);detail=signal<OrderDetail|null>(null);message=signal('讀取中…');busy=signal(false);
 constructor(){void this.load(Number(this.route.snapshot.paramMap.get('id')));}
 async load(id:number){try{this.detail.set(await this.service.detail(id));this.message.set('');}catch{this.message.set('找不到訂單或無權查看。');}}
 statusName(status:string){return ({PENDING:'待處理',PROCESSING:'處理中',SHIPPED:'已出貨',COMPLETED:'已完成',CANCELLED:'已取消'} as Record<string,string>)[status] ?? status;}
 async cancel(id:number){if(!confirm('確定取消這筆未付款訂單？'))return;this.busy.set(true);try{await this.service.cancel(id);await this.load(id);this.message.set('訂單已取消。');}catch(e){this.message.set(e instanceof HttpErrorResponse && e.error?.message ? e.error.message : '取消失敗，請重新整理訂單。');}finally{this.busy.set(false);}}
}
