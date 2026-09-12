import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

export class PendingTracker {
  /** Счётчик активных запросов. */
  readonly pending$ = new BehaviorSubject<number>(0);

  /** Поток «идёт ли загрузка». */
  readonly loading$: Observable<boolean> = this.pending$.pipe(
    map((n) => n > 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  get count(): number {
    return this.pending$.value;
  }

  get isLoading(): boolean {
    return this.pending$.value > 0;
  }

  track(): void {
    this.pending$.next(this.pending$.value + 1);
  }

  release(): void {
    this.pending$.next(Math.max(0, this.pending$.value - 1));
  }

  reset(): void {
    this.pending$.next(0);
  }

  dispose(): void {
    this.pending$.complete();
  }
}
