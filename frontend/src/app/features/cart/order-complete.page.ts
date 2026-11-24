import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({selector:'app-order-complete-page',standalone:true,imports:[RouterLink],template:`<section class="completion-page"><div class="completion-mark">✓</div><h1>訂單已成立</h1><p>可至會員中心查看訂單狀態及明細。</p><a class="btn btn--dark" [routerLink]="['/account/orders',id]">查看訂單</a></section>`})
export class OrderCompletePageComponent { readonly id=inject(ActivatedRoute).snapshot.queryParamMap.get('id'); }
