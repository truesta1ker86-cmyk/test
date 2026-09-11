import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { Observable, forkJoin, Subject, Subscription } from 'rxjs';
import { shareReplay, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { OzonWarehouse } from '../../infrastructure/models/ozon-warehouse.model';
import { WarehouseSettings } from '../../infrastructure/models/stock.model';
import { StockService } from '../../infrastructure/services/stock.service';
import { ProductService } from '../../infrastructure/services/product.service';
import { AllocationService } from '../../infrastructure/services/allocation.service';
import { PreviewResult } from '../../infrastructure/models/preview.interface';
import { Stock } from '../../infrastructure/models/stock.model';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { FilterConfig } from '../../../../shared/directives/filter-panel/infrastructure/models/filter.model';
import { AllocationFilterOptions, buildAllocationFilterConfig } from '../../infrastructure/config/filter.config';
import { AdditionalFiltersService } from './infrastructure/services/additional-filters.service';

@Component({
  selector: 'app-allocation',
  standalone: false,
  templateUrl: './allocation.component.html',
  styleUrls: ['./allocation.component.scss'],
  providers: [
    AdditionalFiltersService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationComponent implements OnInit, OnDestroy {
  // ==================== ДАННЫЕ ====================
  warehouses$: Observable<OzonWarehouse[]>;
  products: any[] = [];
  stocks: Stock[] = [];
  rules: any[] = [];
  selectedWarehouseIds: string[] = [];
  loading = false;
  currentTimestamp = new Date();

  // Настройки складов
  warehouseSettings: WarehouseSettings[] = [];

  // Опции для фильтров
  categories: { value: string; label: string }[] = [];
  types: { value: string; label: string }[] = [];
  brands: string[] = [];
  groups: string[] = [];
  series: string[] = [];
  lengths: string[] = [];
  colors: string[] = [];
  packages: string[] = [];

  // Конфигурация панели фильтров
  filterConfigs: FilterConfig[] = [];

  // Матрица данных
  matrixData: any[] = [];

  // Состояние
  hasChanges = false;
  showPreview = false;
  previewResult: PreviewResult | null = null;
  operationId: string | null = null;
  rows = 50;

  nameSuggestions: string[] = [];

  // Попап фильтров
  filterPopoverVisible = false;

  // Статистика
  selectedCount = 0;
  changedCount = 0;
  isOneCReady = false;
  oneCStatus = '1С: проверка данных…';

  // Карта остатков 1С
  availableByOffer = new Map<string, number>();

  public filterService = inject(FilterService);
  readonly filterServiceAdditional = inject(AdditionalFiltersService);

  // Подписка на изменения фильтров
  private filterChangesSubscription: Subscription | null = null;

  constructor(
    private stockService: StockService,
    private productService: ProductService,
    private allocationService: AllocationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.warehouses$ = this.stockService.getFilteredOzonWarehouses().pipe(
      shareReplay(1)
    );
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy() {
  }

  // ==================== ЗАГРУЗКА ДАННЫХ ====================
  loadData(): void {
    this.loading = true;
    forkJoin({
      products: this.productService.getProducts(30),
      rules: this.allocationService.getRules(),
      stocks: this.stockService.getStocks(),
      facets: this.productService.getFilterFacets(),
    }).subscribe({
      next: ({ products, rules, stocks, facets }) => {
        this.products = products.items || [];
        this.rules = rules?.items || [];
        this.stocks = stocks.items || [];

        this.availableByOffer = this.buildAvailableByOffer(this.stocks);
        this.buildFilterOptions(this.products);
        this.loadFacetOptions(facets);
        this.buildFilterConfigs();

        this.warehouses$.subscribe((warehouses) => {
          if (warehouses.length && !this.selectedWarehouseIds.length) {
            this.selectedWarehouseIds = warehouses.slice(0, 2).map((w) => w.warehouse_id);
            this.initWarehouseSettings();
          }
          this.buildMatrix();
          this.loading = false;
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }


  onSearchOfferChange(value: string): void {
    this.filterServiceAdditional.updateFilter('searchOffer', value);
  }

  onSearchNameChange(value: string): void {
    this.filterServiceAdditional.updateFilter('searchName', value);
  }

  // ==================== КАРТА ОСТАТКОВ 1С ====================
  private buildAvailableByOffer(stocks: Stock[]): Map<string, number> {
    const availableBaseBySku = new Map<string, number>();
    const directAvailableByOffer = new Map<string, number>();

    stocks
      .filter((s) => s.source === '1c')
      .forEach((stock) => {
        const sku1c = String(stock.sku_1c || '').trim();
        const availableBase = Number(stock.available || 0);

        if (sku1c) {
          availableBaseBySku.set(sku1c, (availableBaseBySku.get(sku1c) || 0) + availableBase);
        }
        if (stock.offer_id) {
          directAvailableByOffer.set(
            stock.offer_id,
            (directAvailableByOffer.get(stock.offer_id) || 0) + availableBase,
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

  getAvailable1c(offerId: string): number | null {
    return this.availableByOffer.get(offerId) ?? null;
  }

  // ==================== ОПЦИИ ФИЛЬТРОВ ====================
  private loadFacetOptions(facets: any): void {
    const extractValues = (items: any[]): string[] => {
      if (!items) return [];
      return items.map((item: any) => typeof item === 'string' ? item : item.value).filter(Boolean);
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

    this.nameSuggestions = products.map((p) => p.name).filter(Boolean).sort();
  }

  // ==================== КОНФИГУРАЦИЯ ПАНЕЛИ ФИЛЬТРОВ ====================
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

  // ==================== НАСТРОЙКИ СКЛАДОВ ====================
  initWarehouseSettings(): void {
    this.warehouseSettings = this.selectedWarehouseIds.map((id) => ({
      warehouse_id: id,
      mode: 'share' as 'share' | 'target',
      value: 100,
      quantum: 1,
    }));
  }

  // ==================== ПОСТРОЕНИЕ МАТРИЦЫ ====================
  buildMatrix(): void {
    const settingsMap = new Map<string, WarehouseSettings>();
    this.warehouseSettings.forEach((s) => settingsMap.set(s.warehouse_id, s));

    this.matrixData = this.products.map((product) => {
      const available1c = this.getAvailable1c(product.offer_id);

      const allocation = this.selectedWarehouseIds.reduce((acc, wId) => {
        const setting = settingsMap.get(wId);
        let mode: 'share' | 'target' = 'share';
        let value = 100;
        let quantum = 1;
        if (setting) {
          mode = setting.mode;
          value = setting.value;
          quantum = setting.quantum;
        } else {
          const existingRule = this.rules.find(
            (r: any) => r.offer_id === product.offer_id && r.warehouse_id === wId,
          );
          if (existingRule) {
            mode = existingRule.maintain_target ? 'target' : 'share';
            value = existingRule.maintain_target
              ? existingRule.target_qty
              : (existingRule.share || 1) * 100;
            quantum = existingRule.quantum || 1;
          }
        }
        acc[wId] = { mode, value, quantum };
        return acc;
      }, {} as any);

      return {
        ...product,
        available_1c: available1c,
        rules: this.rules.filter((r: any) => r.offer_id === product.offer_id),
        allocation,
        ozon_stock: product.ozon_stock || null,
        onec_stock: product.onec_stock || null,
      };
    });
    this.hasChanges = false;
    this.changedCount = 0;
    this.updateMatrix();
  }

  // ==================== ОБНОВЛЕНИЕ МАТРИЦЫ ====================
  updateMatrix(): void {
    this.matrixData = [...this.matrixData];
    this.cdr.markForCheck();
  }

  // ==================== ПРИМЕНЕНИЕ ФИЛЬТРОВ ====================
  onApplyFilters(): void {
    this.closeFilterPopover();
  }

  // ==================== ПОПАП ФИЛЬТРОВ ====================
  toggleFilterPopover(): void {
    this.filterPopoverVisible = !this.filterPopoverVisible;
  }
  closeFilterPopover(): void {
    this.filterPopoverVisible = false;
  }

  // ==================== СОБЫТИЯ ОТ ДОЧЕРНИХ КОМПОНЕНТОВ ====================
  onWarehousesChange(newIds: string[]): void {
    this.selectedWarehouseIds = newIds;
    this.initWarehouseSettings();
    this.buildMatrix();
    this.cdr.markForCheck();
  }

  onWarehouseSettingsChange(settings: WarehouseSettings[]): void {
    this.warehouseSettings = settings;
    this.buildMatrix();
    this.cdr.markForCheck();
  }

  onGlobalShareApply(share: number): void {
    this.warehouseSettings = this.warehouseSettings.map((s) => ({ ...s, value: share }));
    this.buildMatrix();
    this.hasChanges = true;
    this.changedCount = this.matrixData.length;
    this.cdr.markForCheck();
  }

  onApplyToSelected(event: { warehouseId: string; settings: WarehouseSettings }): void {
    const { warehouseId, settings } = event;
    this.matrixData = this.matrixData.map((product) => {
      const newAllocation = { ...product.allocation };
      newAllocation[warehouseId] = {
        mode: settings.mode,
        value: settings.value,
        quantum: settings.quantum,
      };
      return { ...product, allocation: newAllocation };
    });
    this.hasChanges = true;
    this.changedCount = this.matrixData.length;
    this.cdr.markForCheck();
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

  // ==================== ДЕЙСТВИЯ ====================
  previewChanges(): void { /* TODO */ }
  applyChanges(): void { /* TODO */ }
  pushChanges(): void { /* TODO */ }

  cancelChanges(): void {
    this.buildMatrix();
    this.showPreview = false;
    this.previewResult = null;
    this.operationId = null;
    this.hasChanges = false;
    this.changedCount = 0;
    this.cdr.markForCheck();
  }

  refreshData(): void {
    this.loadData();
  }

  openExpectedStock(): void {
    alert('Функция ожидаемой поставки будет доступна в следующей версии.');
  }

  resumeAutomation(): void {}
  stopAutomation(): void {}
}
