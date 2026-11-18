import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-admin-orders-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `<div class="admin-page-head"><div><span>訂單與會員</span><h1>訂單管理</h1><p>確認付款、商品狀態與配送進度。</p></div><button class="admin-secondary-btn">匯出訂單</button></div><div class="admin-tabs"><button class="active">全部 <b>24</b></button><button>待付款 <b>4</b></button><button>處理中 <b>7</b></button><button>已出貨 <b>3</b></button><button>已完成 <b>10</b></button></div><section class="admin-card admin-list-card"><div class="admin-filters"><label class="admin-search">⌕ <input placeholder="訂單編號、姓名或手機" /></label><input type="date" /><select><option>所有付款狀態</option><option>待付款</option><option>已付款</option></select><button>篩選</button></div><div class="admin-order-list"><div class="order-admin-row order-admin-head"><span>訂單編號</span><span>顧客</span><span>日期</span><span>商品</span><span>金額</span><span>狀態</span><span></span></div>@for (order of store.orders(); track order.id) { <a class="order-admin-row" [routerLink]="['/admin/orders', order.id]"><b>{{ order.id }}</b><span><strong>林小姐</strong><small>0912 345 678</small></span><span>{{ order.date }}</span><span>{{ order.itemCount }} 件商品</span><strong>{{ order.total | currency:'TWD':'NT$':'1.0-0' }}</strong><span class="status" [class.status--processing]="order.status === '處理中'">{{ order.status }}</span><em>→</em></a> }</div></section>`,
})
export class AdminOrdersPageComponent { readonly store = inject(StoreService); }

