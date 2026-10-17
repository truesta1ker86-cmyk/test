import { effect, inject, Injectable, signal } from '@angular/core';
import { SessionContext } from '../core/session-context';
@Injectable({ providedIn: 'root' })
export class EditorDrafts {
  private readonly tables = new Map<
    number,
    { values: ReturnType<typeof tableValues>; versions: Map<string, string> }
  >();
  forShop(tenant: number) {
    if (!this.tables.has(tenant))
      this.tables.set(tenant, { values: tableValues(), versions: new Map() });
    return this.tables.get(tenant)!;
  }
  readonly values = new Map<string, Record<string, string>>();
  constructor() {
    const context = inject(SessionContext);
    let previous: number | null = null;
    effect(() => {
      const tenant = context.session()?.tenant_id ?? null;
      if (context.status() !== 'ready' || previous !== tenant) this.values.clear();
      previous = tenant;
    });
  }
}
function tableValues() {
  return signal<Record<string, Record<string, string>>>({});
}
