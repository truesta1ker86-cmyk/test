import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { SessionContext } from './session-context';

export const shopInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/v2/api/')) return next(request);
  const context = inject(SessionContext);
  const tenant = context.session()?.tenant_id;
  const generation = context.generation;
  if (context.status() === 'changed') {
    return throwError(() => new Error('Магазин изменился. Обновите страницу.'));
  }
  const pinned = request.clone({
    withCredentials: true,
    setHeaders: tenant ? { 'X-Expected-Tenant-Id': String(tenant) } : {},
  });
  const checkHeaders = (response: HttpResponse<unknown> | HttpErrorResponse) => {
    const returned = response.headers.get('X-Tenant-Id');
    if (
      response.headers.get('X-Tenant-Context-Mismatch') === '1' ||
      (tenant && returned && Number(returned) !== tenant)
    ) {
      context.block();
      throw new Error('Магазин изменился. Обновите страницу.');
    }
  };
  return next(pinned).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) return;
      if (context.generation !== generation) throw new Error('Магазин изменился.');
      checkHeaders(event);
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        checkHeaders(error);
        if (error.status === 401) context.signOut();
      }
      return throwError(() => error);
    }),
  );
};
