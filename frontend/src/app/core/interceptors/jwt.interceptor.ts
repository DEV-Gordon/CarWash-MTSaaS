import { inject } from '@angular/core';
import {
  HttpErrorResponse, HttpInterceptorFn, HttpClient,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

// Adjunta el Bearer token, intenta refrescar en 401 y redirige a /subscription en 402.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  const token = auth.accessToken();
  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh');

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // 402: suscripción vencida/suspendida -> redirige a la pantalla de suscripción.
      if (err.status === 402) {
        router.navigate(['/subscription']);
        return throwError(() => err);
      }

      // 401: intenta refrescar el access token una vez.
      if (err.status === 401 && !isAuthEndpoint && auth.refreshToken) {
        return http
          .post<{ access: string }>(`${environment.apiUrl}/auth/refresh/`, { refresh: auth.refreshToken })
          .pipe(
            switchMap((res) => {
              auth.setAccessToken(res.access);
              const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.access}` } });
              return next(retried);
            }),
            catchError((refreshErr) => {
              auth.logout();
              return throwError(() => refreshErr);
            })
          );
      }

      if (err.status === 401) auth.logout();
      return throwError(() => err);
    })
  );
};
