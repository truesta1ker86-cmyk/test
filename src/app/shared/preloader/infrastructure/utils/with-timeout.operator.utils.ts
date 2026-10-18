import { Observable, TimeoutError, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { TimeoutOptions } from '../interfaces/with-timeout.operator.interfaces';

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
