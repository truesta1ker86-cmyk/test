import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { StockFilter, WarehouseSettings } from '../../../infrastructure/models/stock.model';
import { AllocationService } from '../../../infrastructure/services/allocation.service';
import { ProductService } from '../../../infrastructure/services/product.service';
import { StockService } from '../../../infrastructure/services/stock.service';
import { PreviewResult } from '../../../infrastructure/models/preview.interface';



@Component({
  selector: 'app-allocation-workspace',
  standalone: false,
  templateUrl: './allocation-workspace.component.html',
  styleUrls: ['./allocation-workspace.component.scss'],
})
export class AllocationWorkspaceComponent implements OnInit {
  // Основные данные
  warehouses: any[] = [];
  products: any[] = [];
  rules: any[] = [];
  selectedWarehouseIds: string[] = [];
  loading = false;
  rows = 50;

  // Состояние
  hasChanges = false;
  showPreview = false;
  previewResult: PreviewResult | null = null;
  operationId: string | null = null;

  // Настройки складов
  warehouseSettings: WarehouseSettings[] = [];

  // Фильтры
  filter: StockFilter = {
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
  categories: { value: string; label: string }[] = [];
  types: { value: string; label: string }[] = [];
  brands: string[] = [];
  groups: string[] = [];
  series: string[] = [];
  lengths: string[] = [];
  colors: string[] = [];
  packages: string[] = [];

  // Матрица
  matrixData: any[] = [];

  constructor(
    private allocationService: AllocationService,
    private productService: ProductService,
    private stockService: StockService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      warehouses: this.stockService.getWarehouses().pipe(map((res: any) => res.items || [])),
      products: this.productService.getProducts(30),
      rules: this.allocationService.getRules(),
    }).subscribe({
      next: ({ warehouses, products, rules }) => {
        this.warehouses = warehouses;
        this.products = products.items;
        this.rules = rules?.items || [];

        if (this.warehouses.length && !this.selectedWarehouseIds.length) {
          this.selectedWarehouseIds = this.warehouses.slice(0, 2).map((w: any) => w.warehouse_id);
        }

        this.buildFilterOptions(products.items);
        this.initWarehouseSettings();
        this.buildMatrix();
        this.loading = false;
        this.showPreview = false;
        this.hasChanges = false;
        this.previewResult = null;
        this.operationId = null;
      },
      error: (err) => {
        console.error('Ошибка загрузки:', err);
        this.loading = false;
      },
    });
  }

  // Инициализация настроек складов
  initWarehouseSettings(): void {
    this.warehouseSettings = this.selectedWarehouseIds.map(id => ({
      warehouse_id: id,
      mode: 'share',
      value: 100,
      quantum: 1,
    }));
  }

  buildFilterOptions(products: any[]): void {
    const categorySet = new Map<string, string>();
    const typeSet = new Map<string, string>();
    const brandSet = new Set<string>();
    const groupSet = new Set<string>();
    const seriesSet = new Set<string>();
    const lengthSet = new Set<string>();
    const colorSet = new Set<string>();
    const packageSet = new Set<string>();

    products.forEach((p) => {
      if (p.category_label) categorySet.set(p.category_label, p.category_label);
      if (p.type_label) typeSet.set(p.type_label, p.type_label);
      if (p.brand) brandSet.add(p.brand);
      if (p.group) groupSet.add(p.group);
      if (p.series) seriesSet.add(p.series);
      if (p.length) lengthSet.add(p.length);
      if (p.color) colorSet.add(p.color);
      if (p.package) packageSet.add(p.package);
    });

    this.categories = Array.from(categorySet.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    this.types = Array.from(typeSet.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    this.brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b, 'ru'));
    this.groups = Array.from(groupSet).sort((a, b) => a.localeCompare(b, 'ru'));
    this.series = Array.from(seriesSet).sort((a, b) => a.localeCompare(b, 'ru'));
    this.lengths = Array.from(lengthSet).sort((a, b) => a.localeCompare(b, 'ru'));
    this.colors = Array.from(colorSet).sort((a, b) => a.localeCompare(b, 'ru'));
    this.packages = Array.from(packageSet).sort((a, b) => a.localeCompare(b, 'ru'));
  }

  buildMatrix(): void {
    // Создаём карту настроек для быстрого доступа
    const settingsMap = new Map<string, WarehouseSettings>();
    this.warehouseSettings.forEach(s => settingsMap.set(s.warehouse_id, s));

    this.matrixData = this.products.map((product) => {
      // Для каждого склада используем настройки или создаём по умолчанию
      const allocation = this.selectedWarehouseIds.reduce((acc, wId) => {
        const setting = settingsMap.get(wId);
        // Если есть настройка, используем её, иначе берём из правил (если они были сохранены)
        let mode = 'share';
        let value = 100;
        let quantum = 1;
        if (setting) {
          mode = setting.mode;
          value = setting.value;
          quantum = setting.quantum;
        } else {
          // Если настройки нет, попробуем найти правило
          const existingRule = this.rules.find(
            (r: any) => r.offer_id === product.offer_id && r.warehouse_id === wId,
          );
          if (existingRule) {
            mode = existingRule.maintain_target ? 'target' : 'share';
            value = existingRule.maintain_target ? existingRule.target_qty : (existingRule.share || 1) * 100;
            quantum = existingRule.quantum || 1;
          }
        }
        acc[wId] = { mode: mode as 'share' | 'target', value, quantum };
        return acc;
      }, {} as any);

      return {
        ...product,
        rules: this.rules.filter((r: any) => r.offer_id === product.offer_id),
        allocation,
      };
    });
    this.hasChanges = false;
  }

  // Обработчики событий от дочерних компонентов

  onFilterChange(newFilter: StockFilter): void {
    this.filter = { ...this.filter, ...newFilter };
    // можно добавить фильтрацию matrixData
  }

  onWarehousesChange(warehouseIds: string[]): void {
    this.selectedWarehouseIds = warehouseIds;
    this.initWarehouseSettings();
    this.buildMatrix();
  }

  onWarehouseSettingsChange(settings: WarehouseSettings[]): void {
    this.warehouseSettings = settings;
    this.buildMatrix();
  }

  onGlobalShareApply(share: number): void {
    // Обновляем настройки всех складов
    this.warehouseSettings = this.warehouseSettings.map(s => ({
      ...s,
      value: share,
    }));
    // Обновляем матрицу
    this.buildMatrix();
    this.hasChanges = true;
  }

  onApplyToSelected(event: { warehouseId: string; settings: WarehouseSettings }): void {
    const { warehouseId, settings } = event;
    // Применить настройки к выбранным товарам (пока ко всем, но в реальности надо использовать выделение)
    // Для примера применим ко всем товарам в матрице
    this.matrixData = this.matrixData.map(product => {
      const newAllocation = { ...product.allocation };
      newAllocation[warehouseId] = {
        mode: settings.mode,
        value: settings.value,
        quantum: settings.quantum,
      };
      return { ...product, allocation: newAllocation };
    });
    this.hasChanges = true;
  }

  // Действия

  previewChanges(): void {
    if (!this.matrixData.length) {
      alert('Нет данных для проверки');
      return;
    }

    const drafts: any[] = [];
    this.matrixData.forEach((product) => {
      this.selectedWarehouseIds.forEach((wId) => {
        const allocation = product.allocation?.[wId];
        if (allocation) {
          drafts.push({
            offer_id: product.offer_id,
            warehouse_id: wId,
            maintain_target: allocation.mode === 'target',
            target_qty: allocation.mode === 'target' ? allocation.value : null,
            share: allocation.mode === 'share' ? allocation.value / 100 : null,
            quantum: allocation.quantum || 1,
            enabled: allocation.value > 0,
          });
        }
      });
    });

    this.allocationService.previewMatrix(drafts).subscribe({
      next: (result) => {
        this.operationId = result.operation_id;
        this.showPreview = true;
        this.previewResult = {
          success: result.errors === 0,
          message: `Проверка выполнена. Найдено ${result.matched_products} товаров, ${result.rules} правил.`,
          items: result.sample || [],
        };
        this.hasChanges = true;
      },
      error: (err) => {
        this.showPreview = true;
        this.previewResult = {
          success: false,
          message: 'Ошибка проверки: ' + err.message,
          items: [],
        };
      },
    });
  }

  applyChanges(): void {
    const operationId = this.operationId;
    if (!operationId) {
      alert('Сначала выполните проверку');
      return;
    }
    if (!confirm('Сохранить правила распределения?')) return;

    this.allocationService.applyMatrix(operationId).subscribe({
      next: (result) => {
        this.previewResult = {
          success: true,
          message: `Правила сохранены. Применено: ${result.applied}`,
          items: [],
        };
        this.hasChanges = false;
        this.operationId = null;
        this.loadData();
      },
      error: (err) => {
        this.previewResult = {
          success: false,
          message: 'Ошибка сохранения: ' + err.message,
          items: [],
        };
      },
    });
  }

  pushChanges(): void {
    const operationId = this.operationId;
    if (!operationId) {
      alert('Сначала выполните проверку');
      return;
    }
    if (!confirm('Отправить остатки в маркетплейс?')) return;

    this.allocationService.pushMatrix(operationId, true).subscribe({
      next: (dryResult) => {
        if (dryResult.errors > 0) {
          this.previewResult = {
            success: false,
            message: 'Dry-run не пройден: ' + dryResult.message,
            items: [],
          };
          return;
        }

        this.allocationService.pushMatrix(operationId, false).subscribe({
          next: (pushResult) => {
            this.previewResult = {
              success: true,
              message: `Отправлено в маркетплейс. Обработано: ${pushResult.pushed}`,
              items: [],
            };
            this.hasChanges = false;
            this.operationId = null;
          },
          error: (err) => {
            this.previewResult = {
              success: false,
              message: 'Ошибка отправки: ' + err.message,
              items: [],
            };
          },
        });
      },
      error: (err) => {
        this.previewResult = {
          success: false,
          message: 'Ошибка dry-run: ' + err.message,
          items: [],
        };
      },
    });
  }

  cancelChanges(): void {
    if (!confirm('Отменить все несохранённые изменения?')) return;
    this.buildMatrix();
    this.showPreview = false;
    this.previewResult = null;
    this.operationId = null;
    this.hasChanges = false;
  }

  refreshData(): void {
    this.loadData();
  }
}