import {
    BehaviorSubject,
    Observable,
    OperatorFunction,
    defer,
    finalize,
  } from 'rxjs';
  
  export function withCounter<T>(
    counter: BehaviorSubject<number>,
  ): OperatorFunction<T, T> {
    return (source: Observable<T>) =>
      defer(() => {
        counter.next(counter.value + 1);
        return source.pipe(
          finalize(() => counter.next(Math.max(0, counter.value - 1))),
        );
      });
  }