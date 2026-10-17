import { Injectable, signal } from '@angular/core';
import type { MatrixCell, WarehouseDefaults } from './contracts';
import type { StockView } from './filter-state';
export function stockValidationState() {
  return {
    errors: signal<Record<string, string>>({}),
    invalidInputs: signal<Record<string, string>>({}),
  };
}

function workspace() {
  return {
    matrix: signal<MatrixCell[]>([]),
    validation: stockValidationState(),
    selection: signal(new Set<string>()),
    columns: signal<string[] | null>(null),
    expected: signal<Record<string, number | null>>({}),
    names: signal<Record<string, string>>({}),
    views: new Map<string, StockView>(),
    warehouseDefaults: signal<Record<string, WarehouseDefaults>>({}),
    globalShare: signal('100'),
    detail: signal({ page: 1, size: 100, warehouse: '' }),
    arrival: signal(''),
  };
}
@Injectable({ providedIn: 'root' })
export class StockDrafts {
  private readonly shops = new Map<number, ReturnType<typeof workspace>>();
  forShop(tenant: number) {
    if (!this.shops.has(tenant)) this.shops.set(tenant, workspace());
    return this.shops.get(tenant)!;
  }
}
