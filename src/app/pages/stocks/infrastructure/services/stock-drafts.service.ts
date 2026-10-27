import { effect, inject, Injectable, Injector } from '@angular/core';
import { workspace } from '../utils/stock-drafts.utils';

@Injectable({ providedIn: 'root' })
export class StockDrafts {
  private readonly shops = new Map<number, ReturnType<typeof workspace>>();
  private readonly injector = inject(Injector);
  forShop(tenant: number) {
    if (!this.shops.has(tenant)) {
      const state = workspace();
      const key = `o1c:v2:stock-columns:${tenant}`;
      let selected: string[] = [];
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(saved) && saved.every((id) => typeof id === 'string'))
          selected = [...new Set(saved)].slice(0, 12);
      } catch {}
      state.columns.set(selected);
      effect(
        () => {
          const ids = state.columns();
          if (ids === null) return;
          try {
            localStorage.setItem(key, JSON.stringify(ids));
          } catch {}
        },
        { injector: this.injector },
      );
      this.shops.set(tenant, state);
    }
    return this.shops.get(tenant)!;
  }
}
