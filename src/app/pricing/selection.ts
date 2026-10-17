import { effect, inject, Injectable, signal } from '@angular/core';
import { SessionContext } from '../core/session-context';

@Injectable({ providedIn: 'root' })
export class PricingSelection {
  readonly selected = signal<ReadonlySet<string>>(new Set());
  private readonly context = inject(SessionContext);

  constructor() {
    let previous: number | null = null;
    effect(() => {
      const tenant = this.context.session()?.tenant_id ?? null;
      if (this.context.status() !== 'ready' || previous !== tenant) this.clear();
      previous = tenant;
    });
  }
  toggle(offer: string): void {
    const next = new Set(this.selected());
    if (next.has(offer)) next.delete(offer);
    else next.add(offer);
    this.selected.set(next);
  }
  setPage(offers: string[], checked: boolean): void {
    const next = new Set(this.selected());
    for (const offer of offers) {
      if (checked) next.add(offer);
      else next.delete(offer);
    }
    this.selected.set(next);
  }
  clear(): void {
    this.selected.set(new Set());
  }
}
