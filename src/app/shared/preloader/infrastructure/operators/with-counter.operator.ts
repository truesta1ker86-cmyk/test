import { BehaviorSubject, Observable, OperatorFunction, defer, finalize } from 'rxjs';

/**
 * Оборачивает поток: +1 при подписке, -1 при завершении.
 *
 * @example
 *   this.http.get<Item[]>('/api/items').pipe(
 *     withCounter(this.tracker.pending$),
 *   ).subscribe(...);
 */
export function withCounter<T>(counter: BehaviorSubject<number>): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    defer(() => {
      counter.next(counter.value + 1);
      return source.pipe(finalize(() => counter.next(Math.max(0, counter.value - 1))));
    });
}
