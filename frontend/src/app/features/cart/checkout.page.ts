import { CurrencyPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StoreService } from '../../core/services/store.service';

// 2026-11-27：訂單成立後導向訂單頁，讓顧客查看轉帳資訊。
@Component({selector:'app-checkout-page',standalone:true,imports:[CurrencyPipe,FormsModule,RouterLink],template:`
<section class="section"><form class="container checkout-layout" (ngSubmit)="submit()" #formRef="ngForm">
 <div class="checkout-form"><section class="form-section"><h1>填寫訂單資料</h1><div class="form-grid">
 <label>收件人<input name="name" [(ngModel)]="form.name" maxlength="100" required /></label>
 <label>電話<input name="phone" [(ngModel)]="form.phone" maxlength="30" required /></label>
 <label class="full">收件地址<input name="address" [(ngModel)]="form.address" maxlength="500" required /></label>
 </div><p>訂單成立後可查看轉帳帳戶並提交轉出帳號後四碼，管理員核對後確認付款。</p><p>宅配提醒：開箱請全程錄影，如有問題請於收到貨一小時內聯繫官方 LINE 客服。<a routerLink="/info/shipping" target="_blank">查看完整宅配須知 →</a></p></section></div>
 <aside class="order-summary"><h2>訂單摘要</h2>@for(item of store.cart();track item.product.skuId){<p>{{item.product.name}} · {{item.product.skuName}} × {{item.quantity}}：{{item.product.price * item.quantity | currency:'TWD':'NT$'}}</p>}@if(quote();as q){<label>配送方式<select name="shipping" [(ngModel)]="shippingId" (ngModelChange)="refreshQuote()">@for(option of q.options;track option.id){<option [ngValue]="option.id">{{option.name}}</option>}</select></label><p>商品小計：{{q.subtotal | currency:'TWD':'NT$'}}</p><p>稅額合計（含已包含於售價的稅額）：{{q.taxAmount | currency:'TWD':'NT$'}}</p><p>額外加計稅額：{{q.additionalTax | currency:'TWD':'NT$'}}</p><p>運費：{{q.shippingFee | currency:'TWD':'NT$'}}</p><p>合計：{{q.total | currency:'TWD':'NT$'}}</p>}<p>送出時將再次確認商品價格、稅別、物流與庫存；訂單成立不保留庫存，確認收款時才會扣除。</p>@if(!store.cartStockValid()){<p role="alert">商品庫存已變更，請返回購物車調整數量。</p>}<p role="alert">{{error()}}</p><button class="btn btn--coral btn--block" type="submit" [disabled]="busy() || quoting() || !quote() || formRef.invalid || !store.cart().length || !store.cartStockValid()">{{busy() ? '送出中…' : '確認成立訂單'}}</button><a routerLink="/cart">返回購物車</a></aside>
</form></section>`})
export class CheckoutPageComponent {
 readonly store=inject(StoreService); private http=inject(HttpClient); private router=inject(Router); busy=signal(false); quoting=signal(false); error=signal('');
 quote=signal<{options:{id:number;name:string}[];selectedShippingId:number;subtotal:number;taxAmount:number;additionalTax:number;shippingFee:number;total:number}|null>(null);shippingId:number|null=null;
 form={name:'',phone:'',address:''};
 constructor(){if(this.store.cart().length)void this.refreshQuote();}
 private items(){return this.store.cart().map(x=>({skuId:x.product.skuId,quantity:x.quantity,expectedUnitPrice:x.product.price}));}
 async refreshQuote(){this.quoting.set(true);this.error.set('');try{const q=await firstValueFrom(this.http.post<NonNullable<ReturnType<typeof this.quote>>>(`${environment.apiBaseUrl}/orders/quote`,{items:this.items(),shippingMethodId:this.shippingId}));this.shippingId=q.selectedShippingId;this.quote.set(q);}catch(e){this.quote.set(null);this.error.set(e instanceof HttpErrorResponse && e.error?.message ? e.error.message : '無法計算訂單金額，請稍後再試。');}finally{this.quoting.set(false);}}
 async submit(){const quote=this.quote();if(this.busy() || !this.store.cart().length || !this.store.cartStockValid() || !quote)return;this.busy.set(true);this.error.set('');try{const result=await firstValueFrom(this.http.post<{id:number;orderNo:string}>(`${environment.apiBaseUrl}/orders`,{recipientName:this.form.name,recipientPhone:this.form.phone,shippingAddress:this.form.address,items:this.items(),shippingMethodId:this.shippingId,expectedTotal:quote.total}));this.store.clearCart();await this.router.navigate(['/account/orders', result.id]);}catch(e){this.error.set(e instanceof HttpErrorResponse && e.error?.message ? e.error.message : '訂單送出結果無法確認，請先查看訂單紀錄再重試。');if(e instanceof HttpErrorResponse && e.status===409)this.quote.set(null);}finally{this.busy.set(false);}}
}
