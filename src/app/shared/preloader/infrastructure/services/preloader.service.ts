import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { PendingTracker, type TrackedError } from './pending-tracker';

@Injectable({ providedIn: 'root' })
export class PreloaderService {
  private readonly tracker = new PendingTracker();
  private readonly _pendingSignal = signal(0);

  // ─── Потоки ───────────────────────────────────────────────
  readonly pending$ = this.tracker.pending$;
  readonly loading$ = this.tracker.loading$;
  readonly lastError$ = this.tracker.lastError$;

  get errors$(): Observable<TrackedError> {
    return this.tracker.errors$;
  }

  // ─── Сигналы ──────────────────────────────────────────────
  readonly visible = computed(() => this._pendingSignal() > 0);
  readonly count = computed(() => this._pendingSignal());

  // ─── Управление ───────────────────────────────────────────
  show(): void {
    this._pendingSignal.update((n) => n + 1);
    this.tracker.track();
  }

  hide(): void {
    this._pendingSignal.update((n) => Math.max(0, n - 1));
    this.tracker.release();
  }

  track(): void { this.show(); }
  release(): void { this.hide(); }

  resetAll(): void {
    this._pendingSignal.set(0);
    this.tracker.reset();
  }

  reportError(
    message: string,
    options: { source?: string; error?: unknown } = {},
  ): void {
    this.tracker.reportError(message, options);
  }

  wrap<T>(source: Observable<T>): Observable<T> {
    return this.tracker.wrap(source);
  }

  async wrapPromise<T>(task: Promise<T>): Promise<T> {
    this.show();
    try {
      return await task;
    } finally {
      this.hide();
    }
  }

  dispose(): void {
    this.tracker.dispose();
  }
}
