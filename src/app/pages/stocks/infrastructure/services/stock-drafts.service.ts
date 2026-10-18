import { Injectable } from '@angular/core';
import { workspace } from '../utils/stock-drafts.utils';

@Injectable({ providedIn: 'root' })
export class StockDrafts {
  private readonly shops = new Map<number, ReturnType<typeof workspace>>();
  forShop(tenant: number) {
    if (!this.shops.has(tenant)) this.shops.set(tenant, workspace());
    return this.shops.get(tenant)!;
  }
}
