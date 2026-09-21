import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TimeoutError, catchError, finalize, throwError, timeout } from 'rxjs';

import { PreloaderService } from './preloader.service';
import { PRELOADER_CONFIG } from '../tokens/preloader.tokens';

export const preloaderInterceptor: HttpInterceptorFn = (req, next) => {
  const preloader = inject(PreloaderService);
  const config = inject(PRELOADER_CONFIG);

  // Пропускаем запросы с заголовком X-Skip-Preloader
  if (config.respectSkipHeader && req.headers.has(config.skipHeaderName)) {
    return next(req);
  }

  preloader.show();

  return next(req).pipe(
    // ⭐ Таймаут для всех HTTP-запросов
    timeout({ each: config.requestTimeoutMs }),

    catchError((error) => {
      // ─── Таймаут ─────────────────────────────────────
      if (error instanceof TimeoutError) {
        const message = `Превышен таймаут ${config.requestTimeoutMs / 1000} сек: ${req.method} ${req.url}`;

        if (config.logHttpErrors) {
          console.error(`[HTTP TIMEOUT] ${req.method} ${req.url}`, message);
        }

        preloader.reportError(message, { source: 'timeout', error });

        return throwError(() => new Error(message));
      }

      // ─── Обычные HTTP-ошибки ─────────────────────────
      const httpError = error as HttpErrorResponse;

      if (config.logHttpErrors) {
        console.error(
          `[HTTP] ${req.method} ${req.url} → ${httpError.status} ${httpError.statusText}`,
          httpError.message,
        );
      }

      preloader.reportError(`Ошибка запроса ${req.method} ${req.url}`, { source: 'http', error });

      return throwError(() => error);
    }),

    // ─── Сброс счётчика ────────────────────────────────
    finalize(() => preloader.hide()),
  );
};
