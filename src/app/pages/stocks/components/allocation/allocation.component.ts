import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';

import { OzonWarehouse } from '../../infrastructure/models/ozon-warehouse.model';
import { Stock, WarehouseSettings } from '../../infrastructure/models/stock.model';
import { PreviewResult } from '../../infrastructure/models/preview.interface';

import { StockService } from '../../infrastructure/services/stock.service';
import { ProductService } from '../../infrastructure/services/product.service';
import { AllocationService } from '../../infrastructure/services/allocation.service';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { AdditionalFiltersService } from './infrastructure/services/additional-filters.service';

import {
  AllocationFilterOptions,
  buildAllocationFilterConfig,
} from '../../infrastructure/config/filter.config';
import { PendingTracker } from '../../../../shared/preloader/infrastructure/services/pending-tracker';
import { withCounter } from '../../../../shared/rxjs/with-counter.operator';
import { PRELOADER_CONFIG } from '../../../../shared/preloader/infrastructure/tokens/preloader.tokens';



// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

interface ProductsResponse { items: any[]; }
interface RulesResponse { items: any[]; }
interface StocksResponse { items: Stock[]; meta?: { total: number; has_more: boolean }; }

interface DataBundle {
  products: ProductsResponse;
  rules: RulesResponse;
  stocks: StocksResponse;
  warehouses: OzonWarehouse[];
  facets: any;
}

interface AdditionalFilters {
  searchOffer: string;
  searchName: string;
}

// ═══════════════════════════════════════════════════════════════
// ЧИСТЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════

/** Карта остатков 1С: ключ `offer_id` → количество упаковок. */
function buildAvailableByOffer(
  products: any[],
  stocks: Stock[],
): Map<string, number> {
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
}

/** Фильтрация товаров по дополнительным фильтрам. */
function filterProductsByAdditional(
  products: any[],
  filters: AdditionalFilters,
): any[] {
  const searchOffer = (filters.searchOffer ?? '').trim().toLowerCase();
  const searchName = (filters.searchName ?? '').trim().toLowerCase();

  if (!searchOffer && !searchName) return products;

  return products.filter((p) => {
    const id = (p.offer_id ?? '').toLowerCase();
    const name = (p.name ?? '').toLowerCase();

    if (searchOffer && !id.includes(searchOffer)) return false;
    if (searchName && !name.includes(searchName) && !id.includes(searchName)) return false;
    return true;
  });
}

/** Строит матрицу распределения. */
function buildMatrix(
  products: any[],
  rules: any[],
  availableByOffer: Map<string, number>,
  selectedWarehouseIds: string[],
  warehouseSettings: WarehouseSettings[],
): any[] {
  const settingsMap = new Map(warehouseSettings.map((s) => [s.warehouse_id, s]));
  const rulesByOffer = new Map<string, any[]>();

  for (const r of rules) {
    const list = rulesByOffer.get(r.offer_id) ?? [];
    list.push(r);
    rulesByOffer.set(r.offer_id, list);
  }

  return products.map((product) => {
    const allocation: Record<string, any> = {};

    for (const wId of selectedWarehouseIds) {
      const setting = settingsMap.get(wId);
      if (setting) {
        allocation[wId] = {
          mode: setting.mode,
          value: setting.value,
          quantum: setting.quantum,
        };
      } else {
        const existing = (rulesByOffer.get(product.offer_id) ?? [])
          .find((r) => r.warehouse_id === wId);
        allocation[wId] = existing
          ? {
              mode: existing.maintain_target ? 'target' : 'share',
              value: existing.maintain_target
                ? existing.target_qty
                : (existing.share || 1) * 100,
              quantum: existing.quantum || 1,
            }
          : { mode: 'share', value: 100, quantum: 1 };
      }
    }

    return {
      ...product,
      available_1c: availableByOffer.get(product.offer_id) ?? null,
      rules: rulesByOffer.get(product.offer_id) ?? [],
      allocation,
    };
  });
}

function extractFacetValues(items: any): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item : item.value))
    .filter(Boolean);
}

function buildCategories(products: any[]): { value: string; label: string }[] {
  const set = new Map<string, string>();
  for (const p of products) if (p.category_label) set.set(p.category_label, p.category_label);
  return [...set.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

function buildTypes(products: any[]): { value: string; label: string }[] {
  const set = new Map<string, string>();
  for (const p of products) if (p.type_label) set.set(p.type_label, p.type_label);
  return [...set.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

// ═══════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-allocation',
  standalone: false,
  templateUrl: './allocation.component.html',
  styleUrls: ['./allocation.component.scss'],
  providers: [
    AdditionalFiltersService,
    {
      provide: PRELOADER_CONFIG,
      useValue: {
        respectSkipHeader: true,
        skipHeaderName: 'X-Skip-Preloader',
        logHttpErrors: true,
      },
    },
  ],
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

  readonly loading$ = this.tracker.loading$;
  readonly pendingCount$ = this.tracker.pending$;
  readonly lastError$ = this.tracker.lastError$;

  // ═══════════════════════════════════════════════════════════
  // ТРИГГЕР ПЕРЕЗАГРУЗКИ
  // ═══════════════════════════════════════════════════════════
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // ═══════════════════════════════════════════════════════════
  // СТРИМЫ СОСТОЯНИЯ СКЛАДОВ
  // ═══════════════════════════════════════════════════════════
  readonly selectedWarehouseIds$ = new BehaviorSubject<string[]>([]);
  readonly warehouseSettings$ = new BehaviorSubject<WarehouseSettings[]>([]);

  // ═══════════════════════════════════════════════════════════
  // ПОТОК ДАННЫХ
  // ═══════════════════════════════════════════════════════════
  private readonly data$: Observable<DataBundle> = this.refresh$.pipe(
    switchMap(() =>
      forkJoin({
        products: this.productService.getProducts(30).pipe(
          withCounter(this.tracker.pending$),
          catchError((e) => {
            this.tracker.reportError('Не удалось загрузить товары', { source: 'products', error: e });
            return of<ProductsResponse>({ items: [] });
          }),
        ),
        rules: this.allocationService.getRules().pipe(
          withCounter(this.tracker.pending$),
          catchError((e) => {
            this.tracker.reportError('Не удалось загрузить правила', { source: 'rules', error: e });
            return of<RulesResponse>({ items: [] });
          }),
        ),
        stocks: this.stockService.getStocks().pipe(
          withCounter(this.tracker.pending$),
          catchError((e) => {
            this.tracker.reportError('Не удалось загрузить остатки', { source: 'stocks', error: e });
            return of<StocksResponse>({ items: [], meta: { total: 0, has_more: false } });
          }),
        ),
        warehouses: this.stockService.getFilteredOzonWarehouses().pipe(
          withCounter(this.tracker.pending$),
          catchError((e) => {
            this.tracker.reportError('Не удалось загрузить склады', { source: 'warehouses', error: e });
            return of<OzonWarehouse[]>([]);
          }),
        ),
        facets: this.productService.getFilterFacets().pipe(
          withCounter(this.tracker.pending$),
          catchError((e) => {
            this.tracker.reportError('Не удалось загрузить фасеты', { source: 'facets', error: e });
            return of<any>(null);
          }),
        ),
      }),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  // ═══════════════════════════════════════════════════════════
  // ПРОИЗВОДНЫЕ ПОТОКИ
  // ═══════════════════════════════════════════════════════════
  readonly products$ = this.data$.pipe(
    map((d) => d.products.items ?? []),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly rules$ = this.data$.pipe(
    map((d) => d.rules?.items ?? []),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly stocks$ = this.data$.pipe(
    map((d) => d.stocks.items ?? []),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly warehouses$ = this.data$.pipe(
    map((d) => d.warehouses ?? []),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly availableByOffer$ = combineLatest([
    this.products$,
    this.stocks$,
  ]).pipe(
    map(([products, stocks]) => buildAvailableByOffer(products, stocks)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly filteredProducts$ = combineLatest([
    this.products$,
    toObservable(this.filterServiceAdditional.values),
  ]).pipe(
    map(([products, filters]) =>
      filterProductsByAdditional(products, filters as AdditionalFilters),
    ),
    distinctUntilChanged((a, b) =>
      a.length === b.length
      && a.every((p, i) => p.offer_id === b[i]?.offer_id),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  // ─── Опции фильтров ──────────────────────────────────────
  readonly categories$ = this.products$.pipe(map(buildCategories));
  readonly types$ = this.products$.pipe(map(buildTypes));

  readonly brands$ = this.data$.pipe(map((d) => extractFacetValues(d.facets?.brands)));
  readonly groups$ = this.data$.pipe(map((d) => extractFacetValues(d.facets?.groups)));
  readonly series$ = this.data$.pipe(map((d) => extractFacetValues(d.facets?.series)));
  readonly lengths$ = this.data$.pipe(map((d) => extractFacetValues(d.facets?.lengths)));
  readonly colors$ = this.data$.pipe(map((d) => extractFacetValues(d.facets?.colors)));
  readonly packages$ = this.data$.pipe(map((d) => extractFacetValues(d.facets?.packages)));

  readonly nameSuggestions$ = this.products$.pipe(
    map((products) => products.map((p) => p.name).filter(Boolean).sort()),
  );

  readonly filterConfigs$ = combineLatest([
    this.categories$,
    this.types$,
    this.brands$,
    this.groups$,
    this.series$,
    this.lengths$,
    this.colors$,
    this.packages$,
  ]).pipe(
    map(([categories, types, brands, groups, series, lengths, colors, packages]) => {
      const options: AllocationFilterOptions = {
        categories, types, brands, groups, series, lengths, colors, packages,
      };
      return buildAllocationFilterConfig(options);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  // ═══════════════════════════════════════════════════════════
  // МАТРИЦА
  // ═══════════════════════════════════════════════════════════
  readonly matrixData$: Observable<any[]> = combineLatest([
    this.filteredProducts$,
    this.rules$,
    this.availableByOffer$,
    this.selectedWarehouseIds$,
    this.warehouseSettings$,
  ]).pipe(
    map(([products, rules, availableByOffer, ids, settings]) =>
      buildMatrix(products, rules, availableByOffer, ids, settings),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly matrixData = toSignal(this.matrixData$, { initialValue: [] as any[] });

  // ═══════════════════════════════════════════════════════════
  // СОСТОЯНИЯ UI
  // ═══════════════════════════════════════════════════════════

  /**
   * Показывает, идёт ли первая загрузка:
   * — loading = true
   * — данных ещё нет
   * Используется для скелетонов складов и итогов.
   */
  readonly isInitialLoading$: Observable<boolean> = combineLatest([
    this.loading$,
    this.matrixData$,
  ]).pipe(
    map(([loading, matrix]) => loading && matrix.length === 0),
    distinctUntilChanged(),
  );

  /**
   * Скелетон таблицы: идёт загрузка, данных нет, ошибок нет.
   */
  readonly showSkeleton$ = combineLatest([
    this.loading$,
    this.matrixData$,
    this.lastError$,
  ]).pipe(
    map(([loading, matrix, err]) => loading && matrix.length === 0 && !err),
    distinctUntilChanged(),
  );

  /**
   * Ошибка: загрузка завершена, есть ошибка, данных нет.
   */
  readonly showError$ = combineLatest([
    this.loading$,
    this.matrixData$,
    this.lastError$,
  ]).pipe(
    map(([loading, matrix, err]) => !loading && Boolean(err) && matrix.length === 0),
    distinctUntilChanged(),
  );

  /**
   * Частичная ошибка: данные есть, но какой-то запрос упал.
   */
  readonly hasPartialError$ = combineLatest([
    this.lastError$,
    this.matrixData$,
  ]).pipe(
    map(([err, matrix]) => Boolean(err) && matrix.length > 0),
    distinctUntilChanged(),
  );

  readonly isOneCReady = toSignal(
    this.stocks$.pipe(
      map((stocks) => stocks.some((s) => s.source === '1c')),
      distinctUntilChanged(),
    ),
    { initialValue: false },
  );

  readonly totalCount = toSignal(
    this.matrixData$.pipe(map((m) => m.length)),
    { initialValue: 0 },
  );

  // ═══════════════════════════════════════════════════════════
  // ИМПЕРАТИВНОЕ СОСТОЯНИЕ
  // ═══════════════════════════════════════════════════════════
  pageTitle = 'Разделить остаток между складами';
  pageSubtitle = 'Доля распределяется из единого пула базовых единиц SKU 1С';

  rows = 50;
  hasChanges = false;
  showPreview = false;
  previewResult: PreviewResult | null = null;
  operationId: string | null = null;

  selectedCount = 0;
  changedCount = 0;

  filterPopoverVisible = false;

  // ═══════════════════════════════════════════════════════════
  // ЖИЗНЕННЫЙ ЦИКЛ
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void {
    // Автоинициализация складов при первой загрузке
    this.warehouses$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((warehouses) => {
        if (warehouses.length && !this.selectedWarehouseIds$.value.length) {
          const ids = warehouses.slice(0, 2).map((w) => w.warehouse_id);
          this.selectedWarehouseIds$.next(ids);
          this.initWarehouseSettings(ids);
        }
      });

    // Логируем частичные ошибки
    this.lastError$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        if (err) console.warn('[allocation] partial error:', err);
      });
  }

  ngOnDestroy(): void {
    this.tracker.dispose();
  }

  // ═══════════════════════════════════════════════════════════
  // ДЕЙСТВИЯ
  // ═══════════════════════════════════════════════════════════
  retry(): void {
    this.tracker.reset();
    this.refresh$.next();
  }

  refreshData(): void {
    this.retry();
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
  // НАСТРОЙКИ СКЛАДОВ
  // ═══════════════════════════════════════════════════════════
  private initWarehouseSettings(ids: string[]): void {
    this.warehouseSettings$.next(
      ids.map((id) => ({
        warehouse_id: id,
        mode: 'share' as const,
        value: 100,
        quantum: 1,
      })),
    );
  }

  onWarehousesChange(newIds: string[]): void {
    this.selectedWarehouseIds$.next(newIds);
    this.initWarehouseSettings(newIds);
  }

  onWarehouseSettingsChange(settings: WarehouseSettings[]): void {
    this.warehouseSettings$.next(settings);
  }

  onGlobalShareApply(share: number): void {
    const next = this.warehouseSettings$.value.map((s) => ({ ...s, value: share }));
    this.warehouseSettings$.next(next);
    this.hasChanges = true;
  }

  /**
   * Применить настройки к выбранным товарам.
   * Спред идёт первым, `warehouse_id` — последним,
   * чтобы гарантированно переопределить значение из settings (TS2783).
   */
  onApplyToSelected(event: {
    warehouseId: string;
    settings: WarehouseSettings;
  }): void {
    const { warehouseId, settings } = event;

    const list = [...this.warehouseSettings$.value];
    const idx = list.findIndex((s) => s.warehouse_id === warehouseId);

    if (idx === -1) {
      list.push({ ...settings, warehouse_id: warehouseId });
    } else {
      list[idx] = { ...settings, warehouse_id: warehouseId };
    }

    this.warehouseSettings$.next(list);
    this.hasChanges = true;
  }

  // ═══════════════════════════════════════════════════════════
  // ВЫБОР
  // ═══════════════════════════════════════════════════════════
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
    this.selectedCount = this.matrixData().length;
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
    this.showPreview = false;
    this.previewResult = null;
    this.operationId = null;
    this.hasChanges = false;
    this.changedCount = 0;
    this.initWarehouseSettings(this.selectedWarehouseIds$.value);
  }

  openExpectedStock(): void {
    // TODO: открыть панель ожидаемой поставки
    console.warn('Ожидаемая поставка — в разработке');
  }

  resumeAutomation(): void {}
  stopAutomation(): void {}
}
