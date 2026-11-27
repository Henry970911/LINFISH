import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MemberProfile, MemberService } from '../../core/services/member.service';
import { OrderService, OrderSummary } from '../../core/services/order.service';
import { orderStatusName } from './order-status';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <section class="account-hero">
      <div class="container">
        <div>
          <span class="eyebrow eyebrow--light">我的會員中心</span>
          <h1>午安，{{ displayName }}</h1>
          <p>照顧好魚缸，也照顧好每一次選擇。</p>
        </div>
        <div class="member-card">
          <small>MEMBER SINCE {{ memberSince }}</small>
          <b>{{ tierLabel }}</b>
          <span>會員編號：{{ member?.userNo || '讀取中' }}</span>
        </div>
      </div>
    </section>

    <div class="container account-layout">
      <aside class="account-sidebar">
        <div class="account-person">
          <span>{{ memberInitial }}</span>
          <div>
            <b>{{ displayName }}</b>
            <small>{{ member?.email || '正在讀取會員資料…' }}</small>
          </div>
        </div>
        <nav>
          <a
            routerLink="/account"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            >帳戶總覽</a
          >
          <a routerLink="/account/orders" routerLinkActive="active">訂單紀錄</a>
          <a routerLink="/account/profile" routerLinkActive="active">個人資料</a>
          <a routerLink="/account/favorites" routerLinkActive="active">收藏清單</a>
          <button type="button" (click)="logout()">登出帳戶</button>
        </nav>
      </aside>

      <main class="account-main">
        @if (loading) {
          <div class="account-panel"><p>正在讀取會員資料…</p></div>
        } @else if (errorMessage) {
          <div class="account-panel">
            <p class="account-error">{{ errorMessage }}</p>
          </div>
        } @else if (section === 'overview') {
          <div class="account-heading">
            <span class="eyebrow">OVERVIEW</span>
            <h2>帳戶總覽</h2>
          </div>
          <div class="account-stats">
            <div>
              <span>進行中訂單</span><b>{{ activeOrderCount }}</b
              ><a routerLink="/account/orders">查看訂單 →</a>
            </div>
            <div>
              <span>收藏商品</span><b>0</b><a routerLink="/account/favorites">查看收藏 →</a>
            </div>
            <div>
              <span>會員狀態</span><b>{{ member?.status === 1 ? '正常' : '停用' }}</b
              ><small>{{ tierLabel }}</small>
            </div>
          </div>
          <!-- 最近訂單使用 API 回傳的實際資料。 -->
          <div class="account-panel recent-orders">
            <div class="panel-head">
              <div>
                <h3>最近訂單</h3>
              </div>
              <a routerLink="/account/orders">訂單紀錄 →</a>
            </div>
            @if (recentPendingOrders.length) {
              <div class="order-table-wrap">
                <table class="order-table">
                  <thead>
                    <tr><th scope="col">訂單編號</th><th scope="col">狀態</th><th scope="col">金額</th></tr>
                  </thead>
                  <tbody>
                    @for (order of recentPendingOrders; track order.id) {
                      <tr>
                        <td><a [routerLink]="['/account/orders', order.id]">{{ order.orderNo }}</a></td>
                        <td><span class="order-status" [class.is-cancelled]="order.stat === 'ZZ'">{{ statusName(order.stat) }}</span></td>
                        <td>{{ order.total | currency: 'TWD' : 'NT$' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state empty-state--small"><p>目前沒有進行中的訂單。</p></div>
            }
          </div>
        } @else if (section === 'orders') {
          <div class="account-heading">
            <span class="eyebrow">ORDER HISTORY</span>
            <h2>訂單紀錄</h2>
          </div>
          <div class="account-panel order-list-panel">
            @if (orderHistory.length) {
              <div class="order-table-wrap">
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>訂單編號</th>
                      <th>日期</th>
                      <th>狀態</th>
                      <th>金額</th>
                      <th><span class="visually-hidden">訂單明細</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (order of orderHistory; track order.id) {
                      <tr>
                        <td>
                          <a class="order-number" [routerLink]="['/account/orders', order.id]">{{
                            order.orderNo
                          }}</a>
                        </td>
                        <td>{{ order.orderedAt | date: 'yyyy/MM/dd HH:mm' }}</td>
                        <td>
                          <span
                            class="order-status"
                            [class.is-cancelled]="order.stat === 'ZZ'"
                            >{{ statusName(order.stat) }}</span
                          >
                        </td>
                        <td>{{ order.total | currency: 'TWD' : 'NT$' }}</td>
                        <td>
                          <a
                            [routerLink]="['/account/orders', order.id]"
                            [attr.aria-label]="'查看訂單 ' + order.orderNo"
                            >查看 →</a
                          >
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state empty-state--small"><p>尚無訂單紀錄。</p></div>
            }
          </div>
        } @else if (section === 'profile') {
          <div class="account-heading">
            <span class="eyebrow">PROFILE</span>
            <h2>個人資料</h2>
            <p>以下資料來自目前登入的會員帳號。</p>
          </div>
          <form class="account-panel profile-form">
            <div class="form-grid">
              <label>會員編號<input name="userNo" [ngModel]="member?.userNo" readonly /></label>
              <label>會員等級<input name="memberTier" [ngModel]="tierLabel" readonly /></label>
              <label>姓名<input name="name" [(ngModel)]="profile.name" readonly /></label>
              <label
                >手機<input
                  name="phone"
                  [(ngModel)]="profile.phone"
                  readonly
                  placeholder="尚未設定"
              /></label>
              <label class="full"
                >Email<input name="email" [(ngModel)]="profile.email" type="email" readonly
              /></label>
              <label class="full"
                >加入日期<input
                  name="createdAt"
                  [ngModel]="member?.createdAt | date: 'yyyy/MM/dd HH:mm'"
                  readonly
              /></label>
            </div>
            <p>資料修改 API 尚未開放；目前僅顯示資料庫中的真實會員資料。</p>
          </form>
        } @else {
          <div class="account-heading">
            <span class="eyebrow">FAVORITES</span>
            <h2>收藏清單</h2>
          </div>
          <div class="empty-state empty-state--small">
            <span>♡</span>
            <h2>尚無收藏商品</h2>
            <p>收藏 API 串接後，商品會保存到你的帳戶。</p>
            <a class="btn btn--dark" routerLink="/catalog">瀏覽商品</a>
          </div>
        }
      </main>
    </div>
  `,
  styleUrl: '../../css/account/account.page.scss',
})
export class AccountPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly memberService = inject(MemberService);
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly section = (this.route.snapshot.data['section'] ?? 'overview') as string;

  // 2026-11-27：列表及進行中訂單包含 20 核對中。
  readonly statusName = orderStatusName;

  member: MemberProfile | null = null;
  orders: OrderSummary[] = [];
  profile = { name: '', phone: '', email: '' };
  loading = true;
  errorMessage = '';

  get displayName(): string {
    return this.member?.userName || this.member?.email.split('@')[0] || '會員';
  }

  get activeOrderCount(): number {
    return this.recentPendingOrders.length;
  }

  // 2026-11-27：待付款至已出貨皆為進行中，已完成及已取消的訂單保留於訂單紀錄。
  get recentPendingOrders(): OrderSummary[] {
    return this.orders.filter((order) => order.stat === '10' || order.stat === '20' || order.stat === 'DD' || order.stat === '30');
  }

  get orderHistory(): OrderSummary[] {
    return this.orders.filter((order) => order.stat !== '10' && order.stat !== '20' && order.stat !== 'DD' && order.stat !== '30');
  }

  get memberInitial(): string {
    return this.displayName.trim().charAt(0).toUpperCase() || '會';
  }

  get memberSince(): string {
    return this.member ? new Date(this.member.createdAt).getFullYear().toString() : '—';
  }

  get tierLabel(): string {
    const labels: Record<string, string> = {
      Regular: '一般會員',
      VIP: 'VIP 會員',
    };

    return this.member ? (labels[this.member.memberTier] ?? this.member.memberTier) : '讀取中';
  }

  async ngOnInit(): Promise<void> {
    try {
      this.member = await this.memberService.getMe();
      this.profile = {
        name: this.member.userName,
        phone: this.member.userPhone ?? '',
        email: this.member.email,
      };
      if (this.section === 'orders' || this.section === 'overview')
        this.orders = await this.orderService.mine();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        await this.authService.signOut();
        await this.router.navigate(['/login'], {
          queryParams: { expired: '1' },
        });
        return;
      }

      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.errorMessage = '已登入，但資料庫中找不到對應的會員資料，請確認該帳號仍存在。';
      } else {
        this.errorMessage =
          error instanceof Error
            ? `會員資料讀取失敗：${error.message}`
            : '會員資料讀取失敗，請確認後端 API 已啟動。';
      }
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
