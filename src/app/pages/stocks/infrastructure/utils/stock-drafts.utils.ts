import { signal } from '@angular/core';
import type { MatrixCell } from '../interfaces/contracts.interfaces';
import type { WarehouseDefaults } from '../types/contracts.types';
import type { StockView } from '../types/filter-state.types';

export function stockValidationState() {
  return {
    errors: signal<Record<string, string>>({}),
    invalidInputs: signal<Record<string, string>>({}),
  };
}

export function workspace() {
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
