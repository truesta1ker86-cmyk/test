import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
} from 'rxjs/operators';
import { withCounter } from './with-counter.operator';


export interface TrackedError {
  message: string;
  source?: string;
  error?: unknown;
  at: Date;
}

export class PendingTracker {
  /** Счётчик активных запросов. */
  readonly pending$ = new BehaviorSubject<number>(0);

  /** Поток «идёт ли загрузка». */
  readonly loading$: Observable<boolean> = this.pending$.pipe(
    map((n) => n > 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Последняя ошибка. */
  readonly lastError$ = new BehaviorSubject<TrackedError | null>(null);

  /** Поток всех ошибок. */
  private readonly _errors$ = new Subject<TrackedError>();

  get count(): number {
    return this.pending$.value;
  }

  get isLoading(): boolean {
    return this.pending$.value > 0;
  }

  get errors$(): Observable<TrackedError> {
    return this._errors$.asObservable();
  }

  track(): void {
    this.pending$.next(this.pending$.value + 1);
  }

  release(): void {
    this.pending$.next(Math.max(0, this.pending$.value - 1));
  }

  reset(): void {
    this.pending$.next(0);
    this.lastError$.next(null);
  }

  reportError(
    message: string,
    options: { source?: string; error?: unknown } = {},
  ): void {
    const tracked: TrackedError = {
      message,
      source: options.source,
      error: options.error,
      at: new Date(),
    };
    this._errors$.next(tracked);
    this.lastError$.next(tracked);
  }

  wrap<T>(source: Observable<T>): Observable<T> {
    return source.pipe(withCounter(this.pending$));
  }

  dispose(): void {
    this.pending$.complete();
    this._errors$.complete();
    this.lastError$.complete();
  }
}
