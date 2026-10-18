import { Injectable, signal } from '@angular/core';
import type { PromotionModel } from '../../../../infrastructure/types/contracts.types';

@Injectable()
export class PromotionDrafts {
  private shops = new Map<
    number,
    {
      categories: ReturnType<typeof signal<Set<number>>>;
      drafts: ReturnType<typeof signal<Map<number, PromotionModel>>>;
    }
  >();
  forShop(id: number) {
    if (!this.shops.has(id))
      this.shops.set(id, {
        categories: signal(new Set<number>()),
        drafts: signal(new Map<number, PromotionModel>()),
      });
    return this.shops.get(id)!;
  }
}
