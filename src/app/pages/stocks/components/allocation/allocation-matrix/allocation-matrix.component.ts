import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Stock } from '../../../infrastructure/models/stock.model';
import { StockFilter } from '../../../infrastructure/models/stock.model';
import { DataTableColumn } from '../../../../../shared/data-table/components/data-table/models/data-table-config.model';

@Component({
  selector: 'app-allocation-matrix',
  standalone: false,
  templateUrl: './allocation-matrix.component.html',
  styleUrls: ['./allocation-matrix.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationMatrixComponent implements OnInit, OnChanges {
  // ==================== ВХОДНЫЕ СВОЙСТВА ====================
  @Input() products: any[] = [];
  @Input() warehouses: any[] = [];
  @Input() selectedWarehouses: string[] = [];
  @Input() stocks: Stock[] = [];
  @Input() rows = 50;

  // Полный объект фильтра из родителя
  @Input() filter: StockFilter = {
    search: '',
    source: '',
    category: '',
    type: '',
    brand: '',
    group: '',
    series: '',
    length: '',
    color: '',
    package: '',
  };

  // Отдельные поля для поиска (для удобства)
  @Input() searchOffer: string = '';
  @Input() searchName: string = '';

  // ==================== ВЫХОДНЫЕ СОБЫТИЯ ====================
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() dataChange = new EventEmitter<void>();

  // ==================== КАРТЫ ОСТАТКОВ ====================
  private ozonStockMap = new Map<string, number>();
  private oneCStockMap = new Map<string, number>();

  // ==================== ЧЕРНОВИКИ И ПРАВИЛА ====================
  drafts: Map<string, { mode: 'share' | 'target'; value: number; quantum: number }> = new Map();
  rulesMap: Map<string, any> = new Map();

  // ==================== ТАБЛИЦА ====================
  columns: DataTableColumn[] = [];
  filteredData: any[] = [];
  selectedProducts: any[] = [];
  hasChanges = false;

  // ==================== СОРТИРОВКА ====================
  sortKey = 'offer_id';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private cdr: ChangeDetectorRef) {}

  // ==================== ЖИЗНЕННЫЙ ЦИКЛ ====================
  ngOnInit(): void {
    this.buildColumns();
    this.buildStockMaps();
    this.applyFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedWarehouses'] ||
      changes['warehouses'] ||
      changes['products'] ||
      changes['stocks'] ||
      changes['filter'] ||
      changes['searchOffer'] ||
      changes['searchName']
    ) {
      this.buildColumns();
      this.buildStockMaps();
      this.applyFilter();
      this.cdr.markForCheck();
    }
  }

  // ==================== ПОСТРОЕНИЕ КОЛОНОК ====================
  buildColumns(): void {
    if (!this.selectedWarehouses.length) {
      this.columns = [
        { field: 'product', header: 'Товар / артикул', width: '260px', cellTemplate: true },
        { field: 'category', header: 'Категория / тип', width: '180px', cellTemplate: true },
        {
          field: 'available_1c',
          header: 'Физический остаток 1С',
          width: '120px',
          cellTemplate: true,
        },
      ];
      return;
    }
    this.columns = [
      { field: 'product', header: 'Товар / артикул', width: '260px', cellTemplate: true },
      { field: 'category', header: 'Категория / тип', width: '180px', cellTemplate: true },
      {
        field: 'available_1c',
        header: 'Физический остаток 1С',
        width: '120px',
        cellTemplate: true,
      },
      ...this.selectedWarehouses.map((id) => {
        const warehouse = this.warehouses.find((w) => w.warehouse_id === id);
        return {
          field: `stock_${id}`,
          header: warehouse?.warehouse_name || id,
          width: '360px',
          warehouseId: id,
          cellTemplate: true,
        };
      }),
    ];
  }

  // ==================== КАРТЫ ОСТАТКОВ ====================
  buildStockMaps(): void {
    this.ozonStockMap = this.getOzonAvailableByWarehouse();
    this.oneCStockMap = this.getOneCAvailableByOffer();
  }

  getOzonAvailableByWarehouse(): Map<string, number> {
    const map = new Map<string, number>();
    this.stocks
      .filter((s) => s.source === 'ozon')
      .forEach((s) => {
        const offerId = String(s.offer_id || '').trim();
        const warehouseId = String(s.warehouse_id || '').trim();
        if (!offerId || !warehouseId || s.available == null) return;
        const available = Number(s.available);
        if (!Number.isFinite(available)) return;
        const key = `${offerId}|${warehouseId}`;
        const current = map.get(key) || 0;
        map.set(key, current + Math.max(0, available));
      });
    return map;
  }

  getOneCAvailableByOffer(): Map<string, number> {
    const availableBaseBySku = new Map<string, number>();
    const directAvailableByOffer = new Map<string, number>();

    this.stocks
      .filter((s) => s.source === '1c')
      .forEach((s) => {
        const sku1c = String(s.sku_1c || '').trim();
        const availableBase = Number(s.available || 0);

        if (sku1c) {
          availableBaseBySku.set(sku1c, (availableBaseBySku.get(sku1c) || 0) + availableBase);
        }
        if (s.offer_id) {
          directAvailableByOffer.set(
            s.offer_id,
            (directAvailableByOffer.get(s.offer_id) || 0) + availableBase,
          );
        }
      });

    const result = new Map<string, number>();

    directAvailableByOffer.forEach((baseQty, offerId) => {
      const product = this.products.find((p) => p.offer_id === offerId);
      const unitsPerItem = product?.units_per_item || 1;
      result.set(offerId, Math.floor(baseQty / unitsPerItem));
    });

    this.products.forEach((product) => {
      const sku1c = product.sku_1c || '';
      if (sku1c && availableBaseBySku.has(sku1c) && !result.has(product.offer_id)) {
        const baseQty = availableBaseBySku.get(sku1c) || 0;
        const unitsPerItem = product.units_per_item || 1;
        result.set(product.offer_id, Math.floor(baseQty / unitsPerItem));
      }
    });

    this.products.forEach((product) => {
      if (!result.has(product.offer_id)) {
        result.set(product.offer_id, 0);
      }
    });

    return result;
  }

  getPhysicalQty(row: any): number | null {
    if (!row) return null;
    return this.oneCStockMap.get(row.offer_id) ?? null;
  }

  getCurrentOzonQty(row: any, warehouseId: string): number | null {
    if (!row) return null;
    const key = `${row.offer_id}|${warehouseId}`;
    return this.ozonStockMap.get(key) ?? null;
  }

  // ==================== ПРАВИЛА И ЧЕРНОВИКИ ====================
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
    if (!row) {
      return { mode: 'share', value: 100, quantum: 1, enabled: true, dirty: false };
    }
    const key = `${row.offer_id}|${warehouseId}`;
    const draft = this.drafts.get(key);
    if (draft) {
      return {
        mode: draft.mode,
        value: draft.value,
        quantum: draft.quantum,
        enabled: draft.value > 0,
        dirty: true,
      };
    }
    const rule = this.rulesMap.get(key);
    if (rule) {
      return {
        mode: rule.maintain_target ? 'target' : 'share',
        value: rule.maintain_target ? rule.target_qty : (rule.share || 1) * 100,
        quantum: rule.quantum || 1,
        enabled: rule.enabled,
        dirty: false,
      };
    }
    return {
      mode: 'share',
      value: 100,
      quantum: 1,
      enabled: true,
      dirty: false,
    };
  }

  onDraftChange(
    row: any,
    warehouseId: string,
    event: { field: 'mode' | 'value' | 'quantum'; newValue: any },
  ): void {
    if (!row) return;
    const key = `${row.offer_id}|${warehouseId}`;
    const current = this.getRuleState(row, warehouseId);
    let draft = this.drafts.get(key);
    if (!draft) {
      draft = {
        mode: current.mode,
        value: current.value,
        quantum: current.quantum,
      };
    }
    if (event.field === 'mode') {
      draft.mode = event.newValue;
      if (draft.mode === 'share' && draft.value > 100) {
        draft.value = 100;
      }
    } else if (event.field === 'value') {
      draft.value = Number(event.newValue);
    } else if (event.field === 'quantum') {
      draft.quantum = Number(event.newValue) || 1;
    }
    this.drafts.set(key, draft);
    this.hasChanges = true;
    row._changed = true;
    this.dataChange.emit();
    this.cdr.markForCheck();
  }

  // ==================== ФИЛЬТРАЦИЯ (с использованием фильтра) ====================
  applyFilter(): void {
    let filtered = (this.products || []).filter((p) => p != null);
    const f = this.filter;

    if (f.category) {
      filtered = filtered.filter((p) => p.category_label === f.category);
    }
    if (f.type) {
      filtered = filtered.filter((p) => p.type_label === f.type);
    }
    if (f.brand) {
      filtered = filtered.filter((p) => p.brand === f.brand);
    }
    if (f.group) {
      filtered = filtered.filter((p) => p.filter_group === f.group);
    }
    if (f.series) {
      filtered = filtered.filter((p) => p.filter_series === f.series);
    }
    if (f.length) {
      filtered = filtered.filter((p) => p.filter_length_mm?.toString() === f.length);
    }
    if (f.color) {
      filtered = filtered.filter((p) => p.filter_color === f.color);
    }
    if (f.package) {
      filtered = filtered.filter((p) => p.filter_package_qty?.toString() === f.package);
    }

    if (this.searchOffer) {
      const q = this.searchOffer.toLowerCase();
      filtered = filtered.filter((p) => p.offer_id?.toLowerCase().includes(q));
    }
    if (this.searchName) {
      const q = this.searchName.toLowerCase();
      filtered = filtered.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        return nameMatch || p.offer_id?.toLowerCase().includes(q);
      });
    }

    this.filteredData = filtered;
    this.cdr.markForCheck();
  }

  // ==================== ВЫБОР ВСЕХ СТРОК ====================
  selectAll(checked: boolean): void {
    if (checked) {
      this.selectedProducts = [...this.filteredData];
    } else {
      this.selectedProducts = [];
    }
    this.selectionChange.emit(this.selectedProducts);
    this.cdr.markForCheck();
  }

  // ==================== СОХРАНЕНИЕ / ОТМЕНА ====================
  saveDrafts(): void {
    // TODO: отправить drafts на сервер
  }

  cancelDrafts(): void {
    this.drafts.clear();
    this.hasChanges = false;
    this.products.forEach((p) => (p._changed = false));
    this.cdr.markForCheck();
  }

  // ==================== ВЫБОР СТРОК ====================
  onSelectionChange(selected: any[]): void {
    this.selectionChange.emit(selected);
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================
  getWarehouseName(id: string): string {
    const w = this.warehouses.find((item) => item.warehouse_id === id);
    return w?.warehouse_name || id;
  }

  getWarehouseScheme(id: string): string {
    const w = this.warehouses.find((item) => item.warehouse_id === id);
    return w?.is_rfbs ? 'rFBS' : 'FBS';
  }

  trackByOfferId(index: number, item: any): string {
    return item?.offer_id || index;
  }

  trackByWarehouseId(index: number, item: string) {
    return item || index;
  }
}
