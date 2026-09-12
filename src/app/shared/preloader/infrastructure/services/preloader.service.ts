import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreloaderService {
  private readonly _pending = signal(0);

  readonly visible = computed(() => this._pending() > 0);

  readonly count = computed(() => this._pending());

  show(): void {
    this._pending.update((n) => n + 1);
  }

  hide(): void {
    this._pending.update((n) => Math.max(0, n - 1));
  }

  reset(): void {
    this._pending.set(0);
  }

  async wrap<T>(task: Promise<T>): Promise<T> {
    this.show();
    try {
      return await task;
    } finally {
      this.hide();
    }
  }
}
