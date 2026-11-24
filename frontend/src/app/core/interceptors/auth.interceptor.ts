import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const isAuthEndpoint = /\/auth\/(register|login|refresh|logout)$/.test(
    request.url,
  );

  // Auth API 依賴 HttpOnly Cookie，但不能讓攔截器對 refresh 自己再次 refresh。
  if (isAuthEndpoint) {
    return next(request.clone({ withCredentials: true }));
  }

  return from(authService.getAccessToken()).pipe(
    switchMap((accessToken) => {
      const authenticatedRequest = accessToken
        ? request.clone({
            setHeaders: { Authorization: `Bearer ${accessToken}` },
          })
        : request;

      return next(authenticatedRequest).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }

          // Access Token 過期時，由 HttpOnly Cookie 向後端換發新 Token，
          // 成功後只重送原請求一次，避免無限重試。
          return from(authService.refreshSession()).pipe(
            switchMap((refreshedSession) => {
              if (!refreshedSession) {
                void authService.handleExpiredSession();
                return throwError(() => error);
              }

              return next(
                request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${refreshedSession.accessToken}`,
                  },
                }),
              );
            }),
          );
        }),
      );
    }),
  );
};
