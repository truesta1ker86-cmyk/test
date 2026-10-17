import { Injectable, signal } from '@angular/core';

type LocalAutomationState = { status: 'off' | 'running' | 'stopped'; fixed: boolean };

/** UI rehearsal only. No HTTP, storage, timers or marketplace integrations. */
@Injectable({ providedIn: 'root' })
export class LocalStockAutomation {
  private readonly shops = new Map<number, ReturnType<typeof this.create>>();
  private create() {
    return signal<LocalAutomationState>({ status: 'off', fixed: false });
  }
  forShop(tenant: number) {
    if (!this.shops.has(tenant)) this.shops.set(tenant, this.create());
    return this.shops.get(tenant)!.asReadonly();
  }
  start(tenant: number, fixed: boolean) {
    this.forShop(tenant);
    this.shops.get(tenant)!.set({ status: 'running', fixed });
  }
  stop(tenant: number) {
    this.forShop(tenant);
    this.shops.get(tenant)!.set({ status: 'stopped', fixed: false });
  }
}
