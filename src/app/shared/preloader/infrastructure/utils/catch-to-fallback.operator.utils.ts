import { Observable, OperatorFunction, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FallbackOptions } from '../interfaces/catch-to-fallback.operator.interfaces';

export function catchToFallback<T>({
  fallback,
  onError,
}: FallbackOptions<T>): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    source.pipe(
      catchError((error: unknown) => {
        onError?.(error);
        return of(fallback);
      }),
    );
}
