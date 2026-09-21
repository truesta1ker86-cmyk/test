import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

import { OzonWarehouse } from '../../infrastructure/models/ozon-warehouse.model';
import { Stock, WarehouseSettings } from '../../infrastructure/models/stock.model';
import { PreviewResult } from '../../infrastructure/models/preview.interface';

import { StockService } from '../../infrastructure/services/stock.service';
import { ProductService } from '../../infrastructure/services/product.service';
import { AllocationService } from '../../infrastructure/services/allocation.service';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { FilterConfig } from '../../../../shared/directives/filter-panel/infrastructure/models/filter.model';
import { AdditionalFiltersService } from './infrastructure/services/additional-filters.service';

import {
  AllocationFilterOptions,
  buildAllocationFilterConfig,
} from '../../infrastructure/config/filter.config';
import { PendingTracker } from '../../../../shared/preloader/infrastructure/services/pending-tracker';
import { withCounter } from '../../../../shared/preloader/infrastructure/operators/with-counter.operator';


// ═══════════════════════════════════════════════════════════════
// ТИПЫ ОТВЕТОВ API
// ═══════════════════════════════════════════════════════════════

interface ProductsResponse {
  items: any[];
}
interface RulesResponse {
  items: any[];
}
interface StocksResponse {
  items: Stock[];
  meta?: { total: number; has_more: boolean };
}
interface FacetsResponse {
  [key: string]: any;
}

interface DataBundle {
  products: ProductsResponse;
  rules: RulesResponse;
  stocks: StocksResponse;
  warehouses: OzonWarehouse[];
  facets: FacetsResponse | null;
}

// ═══════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-allocation',
  standalone: false,
  templateUrl: './allocation.component.html',
  styleUrls: ['./allocation.component.scss'],
  providers: [AdditionalFiltersService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationComponent implements OnInit, OnDestroy {
  // ═══════════════════════════════════════════════════════════
  // ЗАВИСИМОСТИ
  // ═══════════════════════════════════════════════════════════
  private readonly destroyRef = inject(DestroyRef);
  private readonly stockService = inject(StockService);
  private readonly productService = inject(ProductService);
  private readonly allocationService = inject(AllocationService);

  public readonly filterService = inject(FilterService);
  public readonly filterServiceAdditional = inject(AdditionalFiltersService);

  // ═══════════════════════════════════════════════════════════
  // СЧЁТЧИК + ОШИБКИ
  // ═══════════════════════════════════════════════════════════
  private readonly tracker = new PendingTracker();

  readonly loading = toSignal(this.tracker.loading$, { initialValue: false });
  readonly pendingCount = toSignal(this.tracker.pending$, { initialValue: 0 });
  readonly lastError = toSignal(this.tracker.lastError$, { initialValue: null });

  // ═══════════════════════════════════════════════════════════
  // ПОТОК СКЛАДОВ — shareReplay, чтобы избежать дублей HTTP
  // ═══════════════════════════════════════════════════════════
  warehouses$: Observable<OzonWarehouse[]>;

  // ═══════════════════════════════════════════════════════════
  // ДАННЫЕ
  // ═══════════════════════════════════════════════════════════
  products: any[] = [];
  stocks: Stock[] = [];
  rules: any[] = [];
  selectedWarehouseIds: string[] = [];
  currentTimestamp = new Date();

  warehouseSettings: WarehouseSettings[] = [];

  // Опции фильтров
  categories: { value: string; label: string }[] = [];
  types: { value: string; label: string }[] = [];
  brands: string[] = [];
  groups: string[] = [];
  series: string[] = [];
  lengths: string[] = [];
  colors: string[] = [];
  packages: string[] = [];

  filterConfigs: FilterConfig[] = [];

  matrixData: any[] = [];

  // Состояние
  hasChanges = false;
  showPreview = false;
  previewResult: PreviewResult | null = null;
  operationId: string | null = null;
  rows = 50;

  nameSuggestions: string[] = [];
  filterPopoverVisible = false;

  // Статистика
  selectedCount = 0;
  changedCount = 0;
  isOneCReady = false;

  // Карты для быстрого доступа
  private availableByOffer = new Map<string, number>();
  private warehouseById = new Map<string, OzonWarehouse>();
  private productByOffer = new Map<string, any>();

  // ═══════════════════════════════════════════════════════════
  // СОСТОЯНИЯ UI
  // ═══════════════════════════════════════════════════════════

  /** Показывать блок ошибки — загрузка завершена, ошибка есть, данных нет. */
  readonly showError = computed(
    () => !this.loading() && Boolean(this.lastError()) && this.matrixData.length === 0,
  );

  /** Частичная ошибка — данные есть, но что-то упало. */
  readonly hasPartialError = computed(
    () => Boolean(this.lastError()) && this.matrixData.length > 0,
  );

  // ═══════════════════════════════════════════════════════════
  // КОНСТРУКТОР
  // ═══════════════════════════════════════════════════════════
  constructor() {
    // shareReplay — один HTTP-запрос на все подписки в шаблоне
    this.warehouses$ = this.stockService
      .getFilteredOzonWarehouses()
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  // ═══════════════════════════════════════════════════════════
  // ЖИЗНЕННЫЙ ЦИКЛ
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.tracker.dispose();
  }

  // ═══════════════════════════════════════════════════════════
  // ЗАГРУЗКА — forkJoin с ОБЩЕЙ ошибкой на все запросы
  // ═══════════════════════════════════════════════════════════
  loadData(): void {
    forkJoin({
      products: this.productService.getProducts(30).pipe(withCounter(this.tracker.pending$)),
      rules: this.allocationService.getRules().pipe(withCounter(this.tracker.pending$)),
      stocks: this.stockService.getStocks().pipe(withCounter(this.tracker.pending$)),
      warehouses: this.warehouses$.pipe(withCounter(this.tracker.pending$)),
      facets: this.productService.getFilterFacets().pipe(withCounter(this.tracker.pending$)),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        // ⭐ Одна общая обработка ошибок для всех запросов
        catchError((error: unknown) => {
          const message = this.extractErrorMessage(error);

          this.tracker.reportError(message, {
            source: 'forkJoin',
            error,
          });

          // Не эмитим данные — UI покажет ошибку
          return of(null);
        }),
      )
      .subscribe((result) => {
        // Если ошибка — result === null, данные не применяем
        if (!result) return;

        this.applyData(result as DataBundle);
      });
  }

  /** Повторная загрузка после ошибки. */
  retry(): void {
    this.tracker.reset();
    this.loadData();
  }

  // ═══════════════════════════════════════════════════════════
  // ПРИМЕНЕНИЕ ДАННЫХ
  // ═══════════════════════════════════════════════════════════
  private applyData({ products, rules, stocks, warehouses, facets }: DataBundle): void {
    this.products = products.items ?? [];
    this.rules = rules?.items ?? [];
    this.stocks = stocks.items ?? [];

    // ⭐ Карта продуктов — O(1) доступ в buildAvailableByOffer
    this.productByOffer = new Map(this.products.map((p) => [p.offer_id, p]));

    // ⭐ Карта складов — O(1) доступ в шаблоне
    this.warehouseById = new Map(warehouses.map((w) => [w.warehouse_id, w]));

    // Автоинициализация выбранных складов при первой загрузке
    if (warehouses.length && !this.selectedWarehouseIds.length) {
      this.selectedWarehouseIds = warehouses.slice(0, 2).map((w) => w.warehouse_id);
      this.initWarehouseSettings();
    }

    this.availableByOffer = this.buildAvailableByOffer(this.stocks);
    this.buildFilterOptions(this.products);
    this.loadFacetOptions(facets);
    this.buildFilterConfigs();
    this.updateOneCReady();
    this.buildMatrix();
  }

  // ═══════════════════════════════════════════════════════════
  // ИЗВЛЕЧЕНИЕ СООБЩЕНИЯ ОБ ОШИБКЕ
  // ═══════════════════════════════════════════════════════════
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // TimeoutError → уже преобразован в Error с сообщением
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const e = error as any;
      if (e.error?.detail) return e.error.detail;
      if (e.message) return e.message;
      if (e.statusText) return `Ошибка ${e.status}: ${e.statusText}`;
    }

    return 'Не удалось загрузить данные';
  }

  // ═══════════════════════════════════════════════════════════
  // ФИЛЬТРЫ
  // ═══════════════════════════════════════════════════════════
  onSearchOfferChange(value: string): void {
    this.filterServiceAdditional.updateFilter('searchOffer', value);
  }

  onSearchNameChange(value: string): void {
    this.filterServiceAdditional.updateFilter('searchName', value);
  }

  toggleFilterPopover(): void {
    this.filterPopoverVisible = !this.filterPopoverVisible;
  }

  closeFilterPopover(): void {
    this.filterPopoverVisible = false;
  }

  onApplyFilters(): void {
    this.closeFilterPopover();
  }

  // ═══════════════════════════════════════════════════════════
  // КАРТА ОСТАТКОВ 1С — O(N + K)
  // ═══════════════════════════════════════════════════════════
  private buildAvailableByOffer(stocks: Stock[]): Map<string, number> {
    const availableBaseBySku = new Map<string, number>();
    const directAvailableByOffer = new Map<string, number>();

    for (const stock of stocks) {
      if (stock.source !== '1c') continue;
      const sku1c = String(stock.sku_1c || '').trim();
      const availableBase = Number(stock.available || 0);

      if (sku1c) {
        availableBaseBySku.set(sku1c, (availableBaseBySku.get(sku1c) ?? 0) + availableBase);
      }
      if (stock.offer_id) {
        directAvailableByOffer.set(
          stock.offer_id,
          (directAvailableByOffer.get(stock.offer_id) ?? 0) + availableBase,
        );
      }
    }

    const result = new Map<string, number>();

    directAvailableByOffer.forEach((baseQty, offerId) => {
      const units = this.productByOffer.get(offerId)?.units_per_item || 1;
      result.set(offerId, Math.floor(baseQty / units));
    });

    for (const product of this.products) {
      const sku1c = product.sku_1c || '';
      if (sku1c && availableBaseBySku.has(sku1c) && !result.has(product.offer_id)) {
        const baseQty = availableBaseBySku.get(sku1c) || 0;
        const units = product.units_per_item || 1;
        result.set(product.offer_id, Math.floor(baseQty / units));
      }
    }

    for (const product of this.products) {
      if (!result.has(product.offer_id)) {
        result.set(product.offer_id, 0);
      }
    }

    return result;
  }

  getAvailable1c(offerId: string): number | null {
    return this.availableByOffer.get(offerId) ?? null;
  }

  private updateOneCReady(): void {
    this.isOneCReady = this.stocks.some((s) => s.source === '1c');
  }

  // ═══════════════════════════════════════════════════════════
  // ОПЦИИ ФИЛЬТРОВ
  // ═══════════════════════════════════════════════════════════
  private loadFacetOptions(facets: any): void {
    const extractValues = (items: any[]): string[] => {
      if (!items) return [];
      return items
        .map((item: any) => (typeof item === 'string' ? item : item.value))
        .filter(Boolean);
    };
    this.groups = extractValues(facets?.groups);
    this.brands = extractValues(facets?.brands);
    this.series = extractValues(facets?.series);
    this.lengths = extractValues(facets?.lengths);
    this.colors = extractValues(facets?.colors);
    this.packages = extractValues(facets?.packages);
  }

  buildFilterOptions(products: any[]): void {
    const categorySet = new Map<string, string>();
    const typeSet = new Map<string, string>();

    products.forEach((p) => {
      if (p.category_label) categorySet.set(p.category_label, p.category_label);
      if (p.type_label) typeSet.set(p.type_label, p.type_label);
    });

    this.categories = Array.from(categorySet.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    this.types = Array.from(typeSet.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    this.nameSuggestions = products
      .map((p) => p.name)
      .filter(Boolean)
      .sort();
  }

  private buildFilterConfigs(): void {
    const options: AllocationFilterOptions = {
      categories: this.categories,
      types: this.types,
      brands: this.brands,
      groups: this.groups,
      series: this.series,
      lengths: this.lengths,
      colors: this.colors,
      packages: this.packages,
    };
    this.filterConfigs = buildAllocationFilterConfig(options);
  }

  // ═══════════════════════════════════════════════════════════
  // НАСТРОЙКИ СКЛАДОВ
  // ═══════════════════════════════════════════════════════════
  initWarehouseSettings(): void {
    this.warehouseSettings = this.selectedWarehouseIds.map((id) => ({
      warehouse_id: id,
      mode: 'share' as 'share' | 'target',
      value: 100,
      quantum: 1,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // ПОСТРОЕНИЕ МАТРИЦЫ — O(N × M + K)
  // ═══════════════════════════════════════════════════════════
  buildMatrix(): void {
    // 1. Карта настроек складов — O(M)
    const settingsMap = new Map<string, WarehouseSettings>();
    for (const s of this.warehouseSettings) {
      settingsMap.set(s.warehouse_id, s);
    }

    // 2. Карта правил по offer_id — O(K) один раз
    const rulesByOffer = new Map<string, any[]>();
    for (const r of this.rules) {
      const list = rulesByOffer.get(r.offer_id) ?? [];
      list.push(r);
      rulesByOffer.set(r.offer_id, list);
    }

    // 3. Основной проход — O(N × M)
    this.matrixData = this.products.map((product) => {
      const available1c = this.availableByOffer.get(product.offer_id) ?? null;
      const productRules = rulesByOffer.get(product.offer_id) ?? [];

      const allocation: Record<string, any> = {};

      for (const wId of this.selectedWarehouseIds) {
        const setting = settingsMap.get(wId);

        if (setting) {
          allocation[wId] = {
            mode: setting.mode,
            value: setting.value,
            quantum: setting.quantum,
          };
        } else {
          const existing = productRules.find((r) => r.warehouse_id === wId);
          allocation[wId] = existing
            ? {
                mode: existing.maintain_target ? 'target' : 'share',
                value: existing.maintain_target ? existing.target_qty : (existing.share || 1) * 100,
                quantum: existing.quantum || 1,
              }
            : { mode: 'share', value: 100, quantum: 1 };
        }
      }

      return {
        ...product,
        available_1c: available1c,
        rules: productRules,
        allocation,
        ozon_stock: product.ozon_stock || null,
        onec_stock: product.onec_stock || null,
      };
    });

    this.hasChanges = false;
    this.changedCount = 0;
  }

  // ═══════════════════════════════════════════════════════════
  // СОБЫТИЯ ОТ ДОЧЕРНИХ КОМПОНЕНТОВ
  // ═══════════════════════════════════════════════════════════
  onWarehousesChange(newIds: string[]): void {
    this.selectedWarehouseIds = newIds;
    this.initWarehouseSettings();
    this.buildMatrix();
  }

  onWarehouseSettingsChange(settings: WarehouseSettings[]): void {
    this.warehouseSettings = settings;
    this.buildMatrix();
  }

  onGlobalShareApply(share: number): void {
    this.warehouseSettings = this.warehouseSettings.map((s) => ({
      ...s,
      value: share,
    }));
    this.buildMatrix();
    this.hasChanges = true;
    this.changedCount = this.matrixData.length;
  }

  /**
   * Применить настройки к выбранным товарам.
   * Спред первым, `warehouse_id` — последним (TS2783).
   */
  onApplyToSelected(event: { warehouseId: string; settings: WarehouseSettings }): void {
    const { warehouseId, settings } = event;

    const list = [...this.warehouseSettings];
    const idx = list.findIndex((s) => s.warehouse_id === warehouseId);

    if (idx === -1) {
      list.push({ ...settings, warehouse_id: warehouseId });
    } else {
      list[idx] = { ...settings, warehouse_id: warehouseId };
    }

    this.warehouseSettings = list;
    this.hasChanges = true;
    this.changedCount = this.matrixData.length;
  }

  onSelectionChange(selected: any[]): void {
    this.selectedCount = selected.length;
  }

  onMatrixDataChange(): void {
    this.hasChanges = true;
  }

  clearSelection(): void {
    this.selectedCount = 0;
  }

  selectAllFiltered(): void {
    this.selectedCount = this.matrixData.length;
  }

  // ═══════════════════════════════════════════════════════════
  // ДЕЙСТВИЯ С ПРАВИЛАМИ
  // ═══════════════════════════════════════════════════════════
  previewChanges(): void {
    /* TODO: allocationService.previewMatrix(drafts) */
  }

  applyChanges(): void {
    /* TODO: allocationService.applyMatrix(operationId) */
  }

  pushChanges(): void {
    /* TODO: allocationService.pushMatrix(operationId) */
  }

  cancelChanges(): void {
    this.buildMatrix();
    this.showPreview = false;
    this.previewResult = null;
    this.operationId = null;
    this.hasChanges = false;
    this.changedCount = 0;
  }

  refreshData(): void {
    this.retry();
  }

  openExpectedStock(): void {
    console.warn('Ожидаемая поставка — в разработке');
  }

  resumeAutomation(): void {}
  stopAutomation(): void {}

  // ═══════════════════════════════════════════════════════════
  // БЫСТРЫЕ ГЕТТЕРЫ ДЛЯ ШАБЛОНА — O(1)
  // ═══════════════════════════════════════════════════════════
  getWarehouseName(id: string): string {
    return this.warehouseById.get(id)?.warehouse_name ?? id;
  }

  getWarehouseScheme(id: string): string {
    return this.warehouseById.get(id)?.is_rfbs ? 'rFBS' : 'FBS';
  }

  getWarehouseCount(offerId: string): number {
    const warehouses = new Set<string>();
    for (const s of this.stocks) {
      if (s.offer_id === offerId && s.source === '1c' && s.warehouse_id) {
        warehouses.add(s.warehouse_id);
      }
    }
    return warehouses.size;
  }

  getTotalAvailable(offerId: string): number {
    let sum = 0;
    for (const s of this.stocks) {
      if (s.offer_id === offerId && s.source === '1c') {
        sum += s.available || 0;
      }
    }
    return sum;
  }

  onOpenProduct(offerId: string): void {
    console.log('Открыть продукт', offerId);
  }
}
