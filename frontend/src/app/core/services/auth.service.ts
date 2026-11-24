import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MemberProfile } from './member.service';

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  sessionExpiresAt: string;
  member: MemberProfile;
}

export interface RegisterResponse {
  message: string;
  member: MemberProfile;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Access Token 只保存在記憶體，不寫入 localStorage，降低 XSS 竊取風險。
  private session: AuthResponse | null = null;
  private refreshPromise: Promise<AuthResponse | null> | null = null;

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private absoluteTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityResetAt = 0;
  private redirectingAfterExpiry = false;

  private readonly idleTimeoutMs = 30 * 60 * 1000;
  private readonly activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

  readonly isAuthenticated = signal(false);
  readonly currentMember = signal<MemberProfile | null>(null);

  constructor() {
    // 清除舊版曾寫入 localStorage 的 JWT；正式流程不再使用該資料。
    localStorage.removeItem('linfish.auth.session');

    for (const eventName of this.activityEvents) {
      window.addEventListener(eventName, this.handleActivity, { passive: true });
    }

    // 延後到服務建構完成後再恢復 Session，避免 HttpClient 攔截器循環注入。
    queueMicrotask(() => void this.restoreSession());
  }

  async signUp(name: string, email: string, password: string): Promise<RegisterResponse> {
    const response = await firstValueFrom(
      this.http.post<RegisterResponse>(
        `${environment.apiBaseUrl}/auth/register`,
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
        { withCredentials: true },
      ),
    );

    // 註冊不等於登入；若瀏覽器留有舊 Session，註冊成功後一併撤銷。
    await this.signOut();
    return response;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${environment.apiBaseUrl}/auth/login`,
        {
          email: email.trim().toLowerCase(),
          password,
        },
        { withCredentials: true },
      ),
    );

    this.saveSession(response);
    return response;
  }

  async getSession(): Promise<AuthResponse | null> {
    if (this.session && !this.isExpired(this.session.expiresAt)) {
      return this.session;
    }

    return this.refreshSession();
  }

  async getAccessToken(): Promise<string | null> {
    const currentSession = await this.getSession();
    return currentSession?.accessToken ?? null;
  }

  async refreshSession(): Promise<AuthResponse | null> {
    // 多個 API 同時收到 401 時只允許一個 Refresh 請求，避免 Token 輪替競爭。
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.requestRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}, { withCredentials: true }),
      );
    } catch {
      // 即使網路中斷，前端仍必須立即清除記憶體中的 Access Token。
    } finally {
      this.clearSession();
    }
  }

  async handleExpiredSession(): Promise<void> {
    if (this.redirectingAfterExpiry) {
      return;
    }

    this.redirectingAfterExpiry = true;
    await this.signOut();
    await this.router.navigate(['/login'], {
      queryParams: { expired: '1' },
    });
    this.redirectingAfterExpiry = false;
  }

  private async restoreSession(): Promise<void> {
    await this.refreshSession();
  }

  private async requestRefresh(): Promise<AuthResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(
          `${environment.apiBaseUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        ),
      );

      this.saveSession(response);
      return response;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private saveSession(response: AuthResponse): void {
    this.session = response;
    this.isAuthenticated.set(true);
    this.currentMember.set(response.member);
    this.redirectingAfterExpiry = false;
    this.scheduleIdleLogout();
    this.scheduleAbsoluteLogout(response.sessionExpiresAt);
  }

  private clearSession(): void {
    this.session = null;
    this.isAuthenticated.set(false);
    this.currentMember.set(null);
    this.clearTimer('idle');
    this.clearTimer('absolute');
  }

  private readonly handleActivity = (): void => {
    if (!this.session) {
      return;
    }

    // scroll 等事件可能高頻觸發，每秒最多重設一次計時器。
    const now = Date.now();
    if (now - this.lastActivityResetAt < 1000) {
      return;
    }

    this.lastActivityResetAt = now;
    this.scheduleIdleLogout();
  };

  private scheduleIdleLogout(): void {
    this.clearTimer('idle');
    this.idleTimer = setTimeout(() => {
      void this.handleExpiredSession();
    }, this.idleTimeoutMs);
  }

  private scheduleAbsoluteLogout(sessionExpiresAt: string): void {
    this.clearTimer('absolute');

    const remainingMs = new Date(sessionExpiresAt).getTime() - Date.now();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      void this.handleExpiredSession();
      return;
    }

    this.absoluteTimer = setTimeout(() => {
      void this.handleExpiredSession();
    }, remainingMs);
  }

  private clearTimer(timer: 'idle' | 'absolute'): void {
    const timerId = timer === 'idle' ? this.idleTimer : this.absoluteTimer;

    if (timerId) {
      clearTimeout(timerId);
    }

    if (timer === 'idle') {
      this.idleTimer = null;
    } else {
      this.absoluteTimer = null;
    }
  }

  private isExpired(expiresAt: string): boolean {
    const expiresAtMs = new Date(expiresAt).getTime();
    return !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
  }
}
