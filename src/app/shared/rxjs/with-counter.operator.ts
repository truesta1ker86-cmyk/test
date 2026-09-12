import { defer, finalize, Observable, OperatorFunction } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

export function withCounter<T>(counter: BehaviorSubject<number>): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    defer(() => {
      counter.next(counter.value + 1);
      return source.pipe(finalize(() => counter.next(Math.max(0, counter.value - 1))));
    });
}
