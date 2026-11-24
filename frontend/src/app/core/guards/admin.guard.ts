import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';

/**
 * 前端先依會員等級分流，再呼叫受 Admin Role 保護的後端 API 複核。
 * 真正的存取權限仍由後端決定，不能只依賴畫面或路由判斷。
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  
  const authService = inject(AuthService);
  const adminService = inject(AdminService);
  const router = inject(Router);
  const session = await authService.getSession();

  if (!session) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (session.member.memberTier.toLowerCase() !== 'admin') {
    return router.createUrlTree(['/account']);
  }

  try {

    const access = await adminService.verifyAccess();

    return access.authorized ? true : router.createUrlTree(['/account']);

  } catch (error) {

    if (error instanceof HttpErrorResponse && error.status === 401) {

      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });

    }

    return router.createUrlTree(['/account']);
  }
};
