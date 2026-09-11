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

const EMPTY_FILTERS: CombinedFilters = {
  category: '',
  type: '',
  brand: '',
  group: '',
  series: '',
  length: '',
  color: '',
  package: '',
  searchOffer: '',
  searchName: '',
};

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
  readonly products = input<any[]>([]);
  readonly warehouses = input<any[]>([]);
  readonly selectedWarehouses = input<string[]>([]);
  readonly stocks = input<Stock[]>([]);
  readonly rows = input<number>(50);

  // ═══════════════════════════════════════════════════════════
  // ВЫХОДЫ
  // ═══════════════════════════════════════════════════════════
  readonly selectionChange = output<any[]>();
  readonly dataChange = output<void>();

  // ═══════════════════════════════════════════════════════════
  // ВНУТРЕННЕЕ СОСТОЯНИЕ
  // ═══════════════════════════════════════════════════════════
  readonly drafts = signal<
    Map<
      string,
      {
        mode: 'share' | 'target';
        value: number;
        quantum: number;
      }
    >
  >(new Map());

  readonly rulesMap = signal<Map<string, any>>(new Map());

  readonly selectedProducts = signal<any[]>([]);
  readonly sortKey = signal<string>('offer_id');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  // ═══════════════════════════════════════════════════════════
  // ФИЛЬТРЫ — из Observable в сигнал (field initializer, без конструктора)
  // ═══════════════════════════════════════════════════════════
  readonly filters = toSignal(
    combineLatest([this.filterService.changes$, this.filterServiceAdditional.changes$]).pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      map(
        ([global, additional]): CombinedFilters => ({
          category: global['category'] ?? '',
          type: global['type'] ?? '',
          brand: global['brand'] ?? '',
          group: global['group'] ?? '',
          series: global['series'] ?? '',
          length: global['length'] ?? '',
          color: global['color'] ?? '',
          package: global['package'] ?? '',
          searchOffer: additional.searchOffer ?? '',
          searchName: additional.searchName ?? '',
        }),
      ),
    ),
    { initialValue: { ...EMPTY_FILTERS } },
  );

  // ═══════════════════════════════════════════════════════════
  // ПРОИЗВОДНЫЕ — заменяют ngOnChanges / ngOnInit
  // ═══════════════════════════════════════════════════════════

  private readonly ozonStockMap = computed(() => {
    const map = new Map<string, number>();
    for (const s of this.stocks()) {
      if (s.source !== 'ozon') continue;
      const offerId = String(s.offer_id || '').trim();
      const warehouseId = String(s.warehouse_id || '').trim();
      if (!offerId || !warehouseId || s.available == null) continue;
      const available = Number(s.available);
      if (!Number.isFinite(available)) continue;
      const key = `${offerId}|${warehouseId}`;
      map.set(key, (map.get(key) ?? 0) + Math.max(0, available));
    }
    return map;
  });

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

    const products = this.products();
    const byOffer = new Map(products.map((p) => [p.offer_id, p]));
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
      if (!result.has(product.offer_id)) result.set(product.offer_id, 0);
    }

    return result;
  });

  readonly columns = computed<DataTableColumn[]>(() => {
    const base: DataTableColumn[] = [
      { field: 'product', header: 'Товар / артикул', width: '260px', cellTemplate: true },
      { field: 'category', header: 'Категория / тип', width: '180px', cellTemplate: true },
      {
        field: 'available_1c',
        header: 'Физический остаток 1С',
        width: '120px',
        cellTemplate: true,
      },
    ];

    const selected = this.selectedWarehouses();
    if (!selected.length) return base;

    const byId = new Map(this.warehouses().map((w) => [w.warehouse_id, w]));
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

  readonly filteredData = computed<any[]>(() => {
    const f = this.filters();
    const products = this.products().filter((p) => p != null);
    const matched = products.filter((p) => this.matchesFilters(p, f));
    const sorted = this.sortData(matched);
    return sorted.slice(0, this.rows());
  });

  readonly changedCount = computed(() => this.drafts().size);
  readonly hasChanges = computed(() => this.drafts().size > 0);


  private matchesFilters(product: any, f: CombinedFilters): boolean {
    if (f.category && product.category_label !== f.category) return false;
    if (f.type && product.type_label !== f.type) return false;
    if (f.brand && product.brand !== f.brand) return false;
    if (f.group && product.filter_group !== f.group) return false;
    if (f.series && product.filter_series !== f.series) return false;
    if (f.length && product.filter_length_mm?.toString() !== f.length) return false;
    if (f.color && product.filter_color !== f.color) return false;
    if (f.package && product.filter_package_qty?.toString() !== f.package) return false;

    const id = (product.offer_id ?? '').toLowerCase();
    const name = (product.name ?? '').toLowerCase();
    const searchOffer = (f.searchOffer ?? '').trim().toLowerCase();
    const searchName = (f.searchName ?? '').trim().toLowerCase();

    if (searchOffer && !id.includes(searchOffer)) return false;
    if (searchName && !name.includes(searchName) && !id.includes(searchName)) return false;

    return true;
  }

  private sortData(data: any[]): any[] {
    const key = this.sortKey();
    const factor = this.sortDirection() === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv), 'ru', { numeric: true }) * factor;
    });
  }


  sort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  getRuleState(
    row: any,
    warehouseId: string,
  ): {
    mode: 'share' | 'target';
    value: number;
    quantum: number;
    enabled: boolean;
    dirty: boolean;
  } {
    if (!row) return { mode: 'share', value: 100, quantum: 1, enabled: true, dirty: false };

    const key = `${row.offer_id}|${warehouseId}`;
    const draft = this.drafts().get(key);
    if (draft) {
      return {
        mode: draft.mode,
        value: draft.value,
        quantum: draft.quantum,
        enabled: draft.value > 0,
        dirty: true,
      };
    }
    return { mode: 'share', value: 100, quantum: 1, enabled: true, dirty: false };
  }

  onDraftChange(
    row: any,
    warehouseId: string,
    event: { field: 'mode' | 'value' | 'quantum'; newValue: any },
  ): void {
    if (!row) return;
    const key = `${row.offer_id}|${warehouseId}`;
    const current = this.getRuleState(row, warehouseId);

    this.drafts.update((map) => {
      const next = new Map(map);
      const draft = next.get(key) ?? {
        mode: current.mode,
        value: current.value,
        quantum: current.quantum,
      };
      if (event.field === 'mode') {
        draft.mode = event.newValue;
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

  selectAll(checked: boolean): void {
    const next = checked ? [...this.filteredData()] : [];
    this.selectedProducts.set(next);
    this.selectionChange.emit(next);
  }

  onSelectionChange(selected: any[]): void {
    this.selectedProducts.set(selected);
    this.selectionChange.emit(selected);
  }

  cancelDrafts(): void {
    this.drafts.set(new Map());
    this.dataChange.emit();
  }

  resetRow(offerId: string): void {
    this.drafts.update((map) => {
      const next = new Map(map);
      for (const key of next.keys()) {
        if (key.startsWith(`${offerId}|`)) next.delete(key);
      }
      return next;
    });
    this.dataChange.emit();
  }

  getPhysicalQty(row: any): number | null {
    if (!row) return null;
    return this.oneCStockMap().get(row.offer_id) ?? null;
  }

  getCurrentOzonQty(row: any, warehouseId: string): number | null {
    if (!row) return null;
    return this.ozonStockMap().get(`${row.offer_id}|${warehouseId}`) ?? null;
  }

  getWarehouseName(id: string): string {
    return this.warehouses().find((w) => w.warehouse_id === id)?.warehouse_name || id;
  }

  getWarehouseScheme(id: string): string {
    return this.warehouses().find((w) => w.warehouse_id === id)?.is_rfbs ? 'rFBS' : 'FBS';
  }

  trackByOfferId(index: number, item: any): string {
    return item?.offer_id || String(index);
  }

  trackByWarehouseId(index: number, item: string): string {
    return item || String(index);
  }

  hasSavedRule(row: any, warehouseId: string): boolean {
    if (!row?.offer_id) return false;
    return this.rulesMap().has(`${row.offer_id}|${warehouseId}`);
  }
  
  isRuleSaved(row: any, warehouseId: string): boolean {
    if (!row?.offer_id) return false;
    const dirty = this.getRuleState(row, warehouseId).dirty;
    return !dirty && this.hasSavedRule(row, warehouseId);
  }
}
