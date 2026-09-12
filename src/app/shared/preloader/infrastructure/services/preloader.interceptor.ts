import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';

import { PreloaderService } from './preloader.service';
import { PRELOADER_CONFIG } from '../tokens/preloader.tokens';

export const preloaderInterceptor: HttpInterceptorFn = (req, next) => {
  const preloader = inject(PreloaderService);
  const config = inject(PRELOADER_CONFIG);

  // Пропускаем запросы с заголовком X-Skip-Preloader
  if (
    config.respectSkipHeader &&
    req.headers.has(config.skipHeaderName)
  ) {
    return next(req);
  }

  preloader.show();

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Логируем глобально, но не глотаем — компонент сам решит
      console.error(
        `[HTTP] ${req.method} ${req.url} → ${error.status} ${error.statusText}`,
        error.message,
      );

      preloader.reportError(
        `Ошибка запроса ${req.method} ${req.url}`,
        { source: 'http', error },
      );

      return throwError(() => error);
    }),
    finalize(() => preloader.hide()),
  );
};