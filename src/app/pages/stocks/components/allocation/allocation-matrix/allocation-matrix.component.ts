import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, debounceTime, distinctUntilChanged, map } from 'rxjs';

import { Stock } from '../../../infrastructure/models/stock.model';
import { DataTableColumn } from '../../../../../shared/data-table/components/data-table/models/data-table-config.model';
import { FilterService } from '../../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { CombinedFilters } from '../../../infrastructure/models/filter.interface';
import { AdditionalFiltersService } from '../infrastructure/services/additional-filters.service';
import { applyFilter } from '../../../../../shared/filtering/filter.engine';
import { sortData } from '../../../../../shared/utils/sort-data';


import {
  cellKey,
  EMPTY_FILTERS,
  PRODUCT_FILTER_SCHEMA,
  type DraftCell,
  type DraftChangeEvent,
  type ProductEntity,
  type RuleState,
  type Warehouse,
} from '../../../infrastructure/models/allocation-matrix.types';

@Component({
  selector: 'app-allocation-matrix',
  standalone: false,
  templateUrl: './allocation-matrix.component.html',
  styleUrls: ['./allocation-matrix.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationMatrixComponent {
  // ═══════════════════════════════════════════════════════════
  // ЗАВИСИМОСТИ
  // ═══════════════════════════════════════════════════════════
  private readonly filterService = inject(FilterService);
  private readonly filterServiceAdditional = inject(AdditionalFiltersService);

  // ═══════════════════════════════════════════════════════════
  // ВХОДЫ
  // ═══════════════════════════════════════════════════════════
  readonly products = input<ProductEntity[]>([]);
  readonly warehouses = input<Warehouse[]>([]);
  readonly selectedWarehouses = input<string[]>([]);
  readonly stocks = input<Stock[]>([]);
  readonly rows = input<number>(50);

  /**
   * Сохранённые правила с бэкенда.
   * Каждое должно содержать `offer_id` и `warehouse_id`.
   */
  readonly rules = input<
    Array<{ offer_id: string; warehouse_id: string } & Record<string, unknown>>
  >([]);

  // ═══════════════════════════════════════════════════════════
  // ВЫХОДЫ
  // ═══════════════════════════════════════════════════════════
  readonly selectionChange = output<ProductEntity[]>();
  readonly dataChange = output<void>();

  // ═══════════════════════════════════════════════════════════
  // ВНУТРЕННЕЕ СОСТОЯНИЕ
  // ═══════════════════════════════════════════════════════════
  readonly drafts = signal<Map<string, DraftCell>>(new Map());
  readonly selectedProducts = signal<ProductEntity[]>([]);
  readonly sortKey = signal<string>('offer_id');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  /** Дефолтное состояние ячейки — общая константа. */
  private static readonly DEFAULT_RULE_STATE: RuleState = {
    mode: 'share',
    value: 100,
    quantum: 1,
    enabled: true,
    dirty: false,
  };

  // ═══════════════════════════════════════════════════════════
  // ФИЛЬТРЫ
  // ═══════════════════════════════════════════════════════════
  readonly filters = toSignal(
    combineLatest([
      this.filterService.changes$,
      this.filterServiceAdditional.changes$,
    ]).pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      map(([global, additional]): CombinedFilters => ({
        category: global['category'] ?? '',
        type:     global['type'] ?? '',
        brand:    global['brand'] ?? '',
        group:    global['group'] ?? '',
        series:   global['series'] ?? '',
        length:   global['length'] ?? '',
        color:    global['color'] ?? '',
        package:  global['package'] ?? '',
        searchOffer: additional.searchOffer ?? '',
        searchName:  additional.searchName ?? '',
      })),
    ),
    { initialValue: { ...EMPTY_FILTERS } },
  );

  // ═══════════════════════════════════════════════════════════
  // ПРОИЗВОДНЫЕ
  // ═══════════════════════════════════════════════════════════

  /** Быстрый доступ к складам по id. */
  private readonly warehouseById = computed(
    () => new Map(this.warehouses().map((w) => [w.warehouse_id, w])),
  );

  /** Сохранённые правила: ключ `offer|warehouse` → правило. */
  private readonly rulesMap = computed(() => {
    const map = new Map<string, { offer_id: string; warehouse_id: string }>();
    for (const rule of this.rules()) {
      if (rule?.offer_id && rule?.warehouse_id) {
        map.set(cellKey(rule.offer_id, rule.warehouse_id), rule);
      }
    }
    return map;
  });

  /** Остатки Ozon: ключ `offer|warehouse`. */
  private readonly ozonStockMap = computed(() => {
    const map = new Map<string, number>();
    for (const s of this.stocks()) {
      if (s.source !== 'ozon') continue;
      const offerId = String(s.offer_id || '').trim();
      const warehouseId = String(s.warehouse_id || '').trim();
      if (!offerId || !warehouseId || s.available == null) continue;
      const available = Number(s.available);
      if (!Number.isFinite(available)) continue;
      const key = cellKey(offerId, warehouseId);
      map.set(key, (map.get(key) ?? 0) + Math.max(0, available));
    }
    return map;
  });

  /** Остатки 1С: ключ `offer_id`. */
  private readonly oneCStockMap = computed(() => {
    const availableBaseBySku = new Map<string, number>();
    const directAvailableByOffer = new Map<string, number>();
  
    for (const s of this.stocks()) {
      if (s.source !== '1c') continue;
      const sku1c = String(s.sku_1c || '').trim();
      const availableBase = Number(s.available || 0);
  
      if (sku1c) {
        availableBaseBySku.set(sku1c, (availableBaseBySku.get(sku1c) ?? 0) + availableBase);
      }
      if (s.offer_id) {
        directAvailableByOffer.set(
          s.offer_id,
          (directAvailableByOffer.get(s.offer_id) ?? 0) + availableBase,
        );
      }
    }
  

    const products = this.products().filter(
      (p): p is ProductEntity & { offer_id: string } => Boolean(p.offer_id),
    );
  
    const byOffer = new Map(products.map(p => [p.offer_id, p]));
    const result = new Map<string, number>();
  
    directAvailableByOffer.forEach((baseQty, offerId) => {
      const units = byOffer.get(offerId)?.units_per_item || 1;
      result.set(offerId, Math.floor(baseQty / units));
    });
  
    for (const product of products) {
      const sku1c = product.sku_1c || '';
      if (sku1c && availableBaseBySku.has(sku1c) && !result.has(product.offer_id)) {
        const baseQty = availableBaseBySku.get(sku1c) || 0;
        const units = product.units_per_item || 1;
        result.set(product.offer_id, Math.floor(baseQty / units));
      }
    }
  
    for (const product of products) {
      if (!result.has(product.offer_id)) {
        result.set(product.offer_id, 0);
      }
    }
  
    return result;
  });

  /** Колонки таблицы. */
  readonly columns = computed<DataTableColumn[]>(() => {
    const base: DataTableColumn[] = [
      { field: 'product',      header: 'Товар / артикул',       width: '260px', cellTemplate: true },
      { field: 'category',     header: 'Категория / тип',       width: '180px', cellTemplate: true },
      { field: 'available_1c', header: 'Физический остаток 1С', width: '120px', cellTemplate: true },
    ];

    const selected = this.selectedWarehouses();
    if (!selected.length) return base;

    const byId = this.warehouseById();
    return [
      ...base,
      ...selected.map(
        (id) =>
          ({
            field: `stock_${id}`,
            header: byId.get(id)?.warehouse_name ?? id,
            width: '360px',
            warehouseId: id,
            cellTemplate: true,
          }) as DataTableColumn,
      ),
    ];
  });

  /** Отфильтрованные + отсортированные + порезанные по `rows`. */
  readonly filteredData = computed<ProductEntity[]>(() => {
    const products = this.products().filter((p) => p != null);
    const filters = this.filters();

    const matched = applyFilter(
      products,
      PRODUCT_FILTER_SCHEMA,
      filters as Record<string, string | undefined>,
    );

    const sorted = sortData(matched, this.sortKey(), this.sortDirection());
    return sorted.slice(0, this.rows());
  });

  readonly hasChanges = computed(() => this.drafts().size > 0);

  // ═══════════════════════════════════════════════════════════
  // СОРТИРОВКА
  // ═══════════════════════════════════════════════════════════
  sort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ПРАВИЛА И ЧЕРНОВИКИ
  // ═══════════════════════════════════════════════════════════
  getRuleState(row: ProductEntity | null, warehouseId: string): RuleState {
    if (!row?.offer_id) return AllocationMatrixComponent.DEFAULT_RULE_STATE;

    const draft = this.drafts().get(cellKey(row.offer_id, warehouseId));
    if (!draft) return AllocationMatrixComponent.DEFAULT_RULE_STATE;

    return {
      mode: draft.mode,
      value: draft.value,
      quantum: draft.quantum,
      enabled: draft.value > 0,
      dirty: true,
    };
  }

  /** Есть ли сохранённое правило и нет несохранённых правок. */
  isRuleSaved(row: ProductEntity | null, warehouseId: string): boolean {
    if (!row?.offer_id) return false;
    const dirty = this.getRuleState(row, warehouseId).dirty;
    const hasRule = this.rulesMap().has(cellKey(row.offer_id, warehouseId));
    return !dirty && hasRule;
  }

  onDraftChange(
    row: ProductEntity | null,
    warehouseId: string,
    event: DraftChangeEvent,
  ): void {
    if (!row?.offer_id) return;

    const key = cellKey(row.offer_id, warehouseId);
    const current = this.getRuleState(row, warehouseId);

    this.drafts.update((map) => {
      const next = new Map(map);
      const draft = next.get(key) ?? {
        mode: current.mode,
        value: current.value,
        quantum: current.quantum,
      };

      if (event.field === 'mode') {
        draft.mode = event.newValue as 'share' | 'target';
        if (draft.mode === 'share' && draft.value > 100) draft.value = 100;
      } else if (event.field === 'value') {
        draft.value = Number(event.newValue);
      } else if (event.field === 'quantum') {
        draft.quantum = Number(event.newValue) || 1;
      }

      next.set(key, { ...draft });
      return next;
    });

    this.dataChange.emit();
  }

  // ═══════════════════════════════════════════════════════════
  // ВЫБОР СТРОК
  // ═══════════════════════════════════════════════════════════
  selectAll(checked: boolean): void {
    const next = checked ? [...this.filteredData()] : [];
    this.selectedProducts.set(next);
    this.selectionChange.emit(next);
  }

  onSelectionChange(selected: ProductEntity[]): void {
    this.selectedProducts.set(selected);
    this.selectionChange.emit(selected);
  }

  // ═══════════════════════════════════════════════════════════
  // СОХРАНЕНИЕ / ОТМЕНА
  // ═══════════════════════════════════════════════════════════
  cancelDrafts(): void {
    this.drafts.set(new Map());
    this.dataChange.emit();
  }

  resetRow(offerId: string): void {
    const prefix = `${offerId}|`;
    this.drafts.update((map) => {
      const next = new Map(map);
      for (const key of next.keys()) {
        if (key.startsWith(prefix)) next.delete(key);
      }
      return next;
    });
    this.dataChange.emit();
  }

  // ═══════════════════════════════════════════════════════════
  // ОСТАТКИ
  // ═══════════════════════════════════════════════════════════
  getPhysicalQty(row: ProductEntity | null): number | null {
    return row?.offer_id ? this.oneCStockMap().get(row.offer_id) ?? null : null;
  }

  getCurrentOzonQty(row: ProductEntity | null, warehouseId: string): number | null {
    if (!row?.offer_id) return null;
    return this.ozonStockMap().get(cellKey(row.offer_id, warehouseId)) ?? null;
  }

  // ═══════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ
  // ═══════════════════════════════════════════════════════════
  getWarehouseName(id: string): string {
    return this.warehouseById().get(id)?.warehouse_name ?? id;
  }

  getWarehouseScheme(id: string): string {
    return this.warehouseById().get(id)?.is_rfbs ? 'rFBS' : 'FBS';
  }

  trackByOfferId(index: number, item: ProductEntity): string {
    return item?.offer_id || String(index);
  }

  trackByWarehouseId(index: number, item: string): string {
    return item || String(index);
  }
}