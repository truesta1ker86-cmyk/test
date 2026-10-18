import { Injectable, signal } from '@angular/core';
import type { MappingDraft } from '../../../../infrastructure/interfaces/mapping-logic.interfaces';

@Injectable()
export class MappingDrafts {
  private shops = new Map<number, ReturnType<typeof signal<Map<string, MappingDraft>>>>();
  scope(tenant: number) {
    if (!this.shops.has(tenant)) this.shops.set(tenant, signal(new Map<string, MappingDraft>()));
    return this.shops.get(tenant)!;
  }
}
