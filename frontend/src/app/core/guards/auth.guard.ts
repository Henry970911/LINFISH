import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const session = await authService.getSession();

  if (session) {
    // Admin 帳號不進入一般會員中心；即使手動輸入 /account 也會回管理頁。
    if (session.member.memberTier.toLowerCase() === 'admin' && state.url.startsWith('/account')) {
      return router.createUrlTree(['/admin']);
    }

    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
};
