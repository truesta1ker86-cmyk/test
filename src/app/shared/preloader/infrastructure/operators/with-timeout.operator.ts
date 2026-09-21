import { Observable, TimeoutError, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

export interface TimeoutOptions {
  /** Таймаут в миллисекундах. По умолчанию — 30000 (30 сек). */
  ms?: number;
  /** Сообщение об ошибке. */
  message?: string;
}

/**
 * Прерывает запрос по таймауту и бросает читаемую ошибку.
 *
 * @example
 *   this.http.get('/api/slow').pipe(
 *     withTimeout({ ms: 15000, message: 'Сервер не отвечает' })
 *   )
 */
export function withTimeout<T>(
  options: TimeoutOptions = {},
): (source: Observable<T>) => Observable<T> {
  const ms = options.ms ?? 30_000;
  const message = options.message ?? `Сервер не ответил за ${Math.round(ms / 1000)} сек.`;

  return (source: Observable<T>) =>
    source.pipe(
      timeout({ each: ms }),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new Error(message));
        }
        return throwError(() => err);
      }),
    );
}
