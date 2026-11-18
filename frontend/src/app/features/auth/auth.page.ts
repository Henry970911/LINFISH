import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-page"><div class="auth-visual"><a class="brand brand--light" routerLink="/"><span class="brand__mark">L</span><span><b>LINFISH</b><small>讓水族生活更簡單</small></span></a><div><span class="eyebrow eyebrow--light">MEMBER'S WATER</span><h1>每一次選擇，<br />都更了解你的魚缸。</h1><p>收藏喜歡的魚種、查看會員價格，並保留每一筆照護與訂單紀錄。</p></div><small>LINFISH MEMBERSHIP · 2026</small></div>
      <div class="auth-form-wrap"><a class="auth-back" routerLink="/">← 回到商店</a>
        @if (mode === 'register') { <span class="eyebrow">CREATE ACCOUNT</span><h2>建立免費會員</h2><p>已經有帳號？ <a routerLink="/login">直接登入</a></p><form class="auth-form" (ngSubmit)="submit()"><label>姓名<input name="name" [(ngModel)]="name" required placeholder="怎麼稱呼你？" /></label><label>Email<input name="email" [(ngModel)]="email" type="email" required placeholder="name@example.com" /></label><label>密碼<input name="password" [(ngModel)]="password" type="password" required placeholder="至少 8 個字元" /></label><label class="terms"><input type="checkbox" required />我同意會員條款與隱私權政策</label><button class="btn btn--dark btn--block" type="submit">建立會員帳號</button></form> }
        @else if (mode === 'forgot') { <span class="eyebrow">RESET PASSWORD</span><h2>忘記密碼</h2><p>輸入註冊 Email，我們會寄送重設連結。</p><form class="auth-form" (ngSubmit)="sent = true"><label>Email<input name="email" [(ngModel)]="email" type="email" required placeholder="name@example.com" /></label><button class="btn btn--dark btn--block" type="submit">寄送重設連結</button>@if (sent) { <div class="form-success">✓ 示意：重設信已寄出，請查看信箱。</div> }</form><a class="auth-switch" routerLink="/login">← 返回登入</a> }
        @else { <span class="eyebrow">WELCOME BACK</span><h2>會員登入</h2><p>還沒有帳號？ <a routerLink="/register">免費註冊</a></p><form class="auth-form" (ngSubmit)="submit()"><label>Email<input name="email" [(ngModel)]="email" type="email" required placeholder="name@example.com" /></label><label>密碼<span><input name="password" [(ngModel)]="password" type="password" required placeholder="請輸入密碼" /><a routerLink="/forgot-password">忘記密碼？</a></span></label><button class="btn btn--dark btn--block" type="submit">登入並查看會員價</button><div class="auth-divider"><span>或</span></div><button class="social-login" type="button">LINE 快速登入 <small>串接後啟用</small></button></form> }
      </div>
    </section>
  `,
})
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(StoreService);
  readonly mode = this.route.snapshot.data['mode'] as 'login' | 'register' | 'forgot';
  email = 'demo@linfish.tw';
  password = 'password';
  name = '';
  sent = false;

  submit(): void {
    this.store.loginDemo();
    this.router.navigate(['/account']);
  }
}

