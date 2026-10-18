import { Injectable, WritableSignal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CatalogSelections {
  private readonly scopes = new Map<string, WritableSignal<Set<string>>>();
  scope(tenant: number, mode: string) {
    const key = tenant + ':' + mode;
    let selected = this.scopes.get(key);
    if (!selected) {
      selected = signal(new Set<string>());
      this.scopes.set(key, selected);
    }
    return selected;
  }
}
