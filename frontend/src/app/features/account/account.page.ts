import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <section class="account-hero"><div class="container"><div><span class="eyebrow eyebrow--light">MY LINFISH</span><h1>午安，林小姐</h1><p>照顧好魚缸，也照顧好每一次選擇。</p></div><div class="member-card"><small>MEMBER SINCE 2026</small><b>一般會員</b><span>下一階 VIP 還差 NT$2,540</span><i><em></em></i></div></div></section>
    <div class="container account-layout"><aside class="account-sidebar"><div class="account-person"><span>林</span><div><b>林小姐</b><small>demo&#64;linfish.tw</small></div></div><nav><a routerLink="/account" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">⌂ 帳戶總覽</a><a routerLink="/account/orders" routerLinkActive="active">▤ 訂單紀錄</a><a routerLink="/account/profile" routerLinkActive="active">♙ 個人資料</a><a routerLink="/account/favorites" routerLinkActive="active">♡ 收藏清單</a></nav><button type="button" (click)="logout()">登出帳戶</button></aside>
      <main class="account-main">
        @if (section === 'overview') { <div class="account-heading"><span class="eyebrow">OVERVIEW</span><h2>帳戶總覽</h2></div><div class="account-stats"><div><span>進行中訂單</span><b>1</b><a routerLink="/account/orders">查看訂單 →</a></div><div><span>收藏商品</span><b>6</b><a routerLink="/account/favorites">查看收藏 →</a></div><div><span>累積消費</span><b>NT$3,460</b><small>2026 年度</small></div></div><div class="account-panel"><div class="panel-head"><div><h3>最近訂單</h3><p>追蹤目前處理進度</p></div><a routerLink="/account/orders">全部訂單 →</a></div><div class="order-progress"><div><small>訂單編號</small><b>LF20261118001</b><span class="status status--processing">處理中</span></div><div class="progress-track"><i class="done"></i><i class="done"></i><i></i><i></i></div><div class="progress-labels"><span>訂單成立</span><span>確認商品</span><span>準備出貨</span><span>配送完成</span></div></div></div><div class="account-tip"><span>💧</span><div><b>本週照護提醒</b><p>入冬溫差較大，換水時請先確認新水與缸內水溫差不超過 2°C。</p></div><a routerLink="/guides">閱讀更多</a></div> }
        @else if (section === 'orders') { <div class="account-heading"><span class="eyebrow">ORDER HISTORY</span><h2>訂單紀錄</h2><p>查看付款、出貨與歷史訂單。</p></div><div class="account-panel order-table"><div class="table-row table-head"><span>訂單編號</span><span>日期</span><span>狀態</span><span>金額</span><span></span></div>@for (order of store.orders(); track order.id) { <div class="table-row"><b>{{ order.id }}</b><span>{{ order.date }}</span><span class="status" [class.status--processing]="order.status === '處理中'">{{ order.status }}</span><strong>{{ order.total | currency:'TWD':'NT$':'1.0-0' }}</strong><a [routerLink]="['/account/orders', order.id]">查看 →</a></div> }</div> }
        @else if (section === 'profile') { <div class="account-heading"><span class="eyebrow">PROFILE</span><h2>個人資料</h2><p>更新聯絡資訊與預設收件地址。</p></div><form class="account-panel profile-form"><div class="form-grid"><label>姓名<input name="name" [(ngModel)]="profile.name" /></label><label>手機<input name="phone" [(ngModel)]="profile.phone" /></label><label class="full">Email<input name="email" [(ngModel)]="profile.email" type="email" /></label><label>縣市<select name="city" [(ngModel)]="profile.city"><option>台北市</option><option>新北市</option><option>台中市</option></select></label><label>行政區<input name="district" [(ngModel)]="profile.district" /></label><label class="full">地址<input name="address" [(ngModel)]="profile.address" /></label></div><button class="btn btn--dark" type="button">儲存變更</button></form> }
        @else { <div class="account-heading"><span class="eyebrow">FAVORITES</span><h2>收藏清單</h2></div><div class="empty-state empty-state--small"><span>♡</span><h2>先把喜歡的商品留在這裡</h2><p>收藏功能會在會員 API 串接後保存到你的帳戶。</p><a class="btn btn--dark" routerLink="/catalog">瀏覽商品</a></div> }
      </main>
    </div>
  `,
})
export class AccountPageComponent {
  readonly store = inject(StoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly section = (this.route.snapshot.data['section'] ?? 'overview') as string;
  profile = { name: '林小姐', phone: '0912 345 678', email: 'demo@linfish.tw', city: '台北市', district: '中山區', address: '水族路 18 號 3 樓' };

  logout(): void {
    this.store.logoutDemo();
    this.router.navigate(['/']);
  }
}

