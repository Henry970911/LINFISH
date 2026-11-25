import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-page">
      <div class="auth-visual">
        <a class="brand brand--light" routerLink="/">
          <img class="brand__mark" src="images/linfish-logo.jpg" alt="" width="42" height="42">
          <span><b>LINFISH</b><small>讓水族生活更簡單</small></span>
        </a>
        <div class="line-contact">
          <div class="line-contact__intro"><span class="eyebrow eyebrow--light">STAY CONNECTED</span><h1>與魚軒保持聯繫</h1><p>加入官方 LINE 諮詢，或加入社群掌握最新活動。</p></div>
          <div class="line-contact__cards">
            <section class="line-card">
              <a class="line-card__qr" href="https://lin.ee/lXZexVN" target="_blank" rel="noopener noreferrer" aria-label="開啟官方 LINE"><img src="images/line-official-qr.jpg" alt="官方 LINE QR Code" /></a>
              <div class="line-card__content"><h2>官方 LINE</h2><p class="line-card__id">官方 LINE：&#64;970fpxer<br /><small>(要加 &#64; 才搜尋得到唷!)</small></p><ul><li>魚隻現貨數量詢問</li><li>各類水族器材詢問</li><li>飼養疑難雜症諮詢</li><li>代找特殊魚種服務</li><li>魚隻售後問題處理</li><li>宅配包裹進度查詢</li></ul><a class="line-card__link" href="https://lin.ee/lXZexVN" target="_blank" rel="noopener noreferrer">加入官方 LINE →</a></div>
            </section>
            <section class="line-card">
              <a class="line-card__qr" href="https://line.me/ti/g2/Wxj8zypAWdvqmIbEoGOrczQ8_e3omN9UUdCuUQ?utm_source=invitation&amp;utm_medium=link_copy&amp;utm_campaign=default" target="_blank" rel="noopener noreferrer" aria-label="開啟魚軒水族社群"><img src="images/line-community-qr.jpg" alt="魚軒水族社群 QR Code" /></a>
              <div class="line-card__content"><h2>魚軒水族社群</h2><ul><li>新魚快報</li><li>特價快報</li><li>好康優惠</li><li>福利競標</li><li>新魚影片</li><li>新魚圖片</li></ul><a class="line-card__link" href="https://line.me/ti/g2/Wxj8zypAWdvqmIbEoGOrczQ8_e3omN9UUdCuUQ?utm_source=invitation&amp;utm_medium=link_copy&amp;utm_campaign=default" target="_blank" rel="noopener noreferrer">加入 LINE 社群 →</a></div>
            </section>
          </div>
        </div>
        <small>LINFISH MEMBERSHIP · 2026</small>
      </div>

      <div class="auth-form-wrap">
        <a class="auth-back" routerLink="/">← 回到商店</a>

        @if (successMessage) {
          <div class="form-success">✓ {{ successMessage }}</div>
        }

        @if (errorMessage) {
          <div class="form-message-error">{{ errorMessage }}</div>
        }

        @if (mode === 'register') {
          <span class="eyebrow">CREATE ACCOUNT</span>
          <h2>建立免費會員</h2>
          <p>已經有帳號？ <a routerLink="/login">直接登入</a></p>

          <!--
            此表單只呼叫自有後端 API；後端會直接建立 cmbase.ogcusr 會員資料。
            不會呼叫外部身分驗證服務，也不會寄送驗證信。
          -->
          <form class="auth-form" (ngSubmit)="submit()">
            <label>
              姓名
              <input
                name="name"
                [(ngModel)]="name"
                autocomplete="name"
                required
                placeholder="怎麼稱呼你？"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                [(ngModel)]="email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.com"
              />
            </label>
            <label>
              密碼
              <input
                name="password"
                [(ngModel)]="password"
                type="password"
                autocomplete="new-password"
                minlength="8"
                required
                placeholder="至少 8 個字元"
              />
            </label>
            <label class="terms">
              <input type="checkbox" required />我同意會員條款與隱私權政策
            </label>
            <button class="btn btn--dark btn--block" type="submit" [disabled]="loading">
              {{ loading ? '建立中…' : '建立會員帳號' }}
            </button>
          </form>
        } @else if (mode === 'forgot') {
          <span class="eyebrow">RESET PASSWORD</span>
          <h2>忘記密碼</h2>
          <p>密碼重設功能將於下一步串接。</p>
          <a class="auth-switch" routerLink="/login">← 返回登入</a>
        } @else {
          <span class="eyebrow">WELCOME BACK</span>
          <h2>會員登入</h2>
          <p>還沒有帳號？ <a routerLink="/register">免費註冊</a></p>

          <form class="auth-form" (ngSubmit)="submit()">
            <label>
              Email
              <input
                name="email"
                [(ngModel)]="email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.com"
              />
            </label>
            <label>
              密碼
              <span>
                <input
                  name="password"
                  [(ngModel)]="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  placeholder="請輸入密碼"
                />
                <a routerLink="/forgot-password">忘記密碼？</a>
              </span>
            </label>
            <button class="btn btn--dark btn--block" type="submit" [disabled]="loading">
              {{ loading ? '登入中…' : '登入並查看會員價' }}
            </button>

            <div class="auth-divider"><span>或</span></div>
            <button class="social-login" type="button">
              LINE 快速登入 <small>串接後啟用</small>
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styleUrl: '../../css/auth/auth.page.scss',
})
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly mode = this.route.snapshot.data['mode'] as 'login' | 'register' | 'forgot';

  private readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/account';

  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  password = '';
  name = '';
  loading = false;
  successMessage =
    this.mode === 'login' && this.route.snapshot.queryParamMap.get('registered') === '1'
      ? '會員註冊成功，請使用剛才設定的帳號密碼登入。'
      : '';
  errorMessage =
    this.mode === 'login' && this.route.snapshot.queryParamMap.get('expired') === '1'
      ? '登入時間已逾時，請重新登入。'
      : '';

  async submit(): Promise<void> {
    this.resetMessages();
    this.loading = true;

    try {
      if (this.mode === 'register') {
        await this.authService.signUp(this.name.trim(), this.email.trim(), this.password);

        // 註冊只建立資料，不建立登入狀態；回到登入頁由使用者再次輸入密碼。
        await this.router.navigate(['/login'], {
          queryParams: {
            registered: '1',
            email: this.email.trim(),
            returnUrl: this.returnUrl,
          },
        });
        return;
      } else {
        const result = await this.authService.signIn(this.email.trim(), this.password);

        if (!result.accessToken) {
          throw new Error('登入未建立有效工作階段，請稍後再試。');
        }

        const isAdmin = result.member.memberTier.toLowerCase() === 'admin';
        const requestedAdminPage = this.returnUrl.startsWith('/admin');
        const destination = isAdmin
          ? requestedAdminPage
            ? this.returnUrl
            : '/admin'
          : requestedAdminPage
            ? '/account'
            : this.returnUrl;

        await this.router.navigateByUrl(destination);
      }
    } catch (error) {
      this.handleAuthError(error);
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private resetMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private handleAuthError(error: unknown): void {
    const responseBody = error instanceof HttpErrorResponse ? error.error : error;
    const message =
      this.readErrorField(responseBody, 'message') ??
      (error instanceof Error ? error.message : '操作失敗，請稍後再試。');

    const code = this.readErrorField(responseBody, 'code') ?? '';

    if (code === 'email_exists') {
      this.errorMessage = '這個 Email 已經申請過會員，請直接前往登入。';
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.errorMessage = '嘗試次數過多，請稍候一分鐘再試。';
      return;
    }

    if (code === 'invalid_credentials') {
      this.errorMessage = 'Email 或密碼不正確。';
      return;
    }

    this.errorMessage = message;
  }

  private readErrorField(error: unknown, field: string): string | null {
    if (typeof error !== 'object' || error === null || !(field in error)) {
      return null;
    }

    const value = (error as Record<string, unknown>)[field];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
