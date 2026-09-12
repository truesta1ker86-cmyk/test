import { Observable, OperatorFunction, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface FallbackOptions<T> {
  fallback: T;
  onError?: (error: unknown) => void;
}

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
