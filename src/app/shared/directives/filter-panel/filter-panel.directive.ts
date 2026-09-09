import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  untracked,
} from '@angular/core';
import { FilterConfig, FilterValues, ValidFilterValues } from './infrastructure/models/filter.model';
import { FilterService } from './infrastructure/services/filter.service';

interface FilterPanelContext {
  $implicit: {
    filters: FilterConfig[];
    groupedFilters: Record<string, FilterConfig[]>;
    values: FilterValues;
    validValues: ValidFilterValues;
    activeCount: number;
    hasChanges: boolean;
    isResetting: boolean;
    getValue: (key: string) => any;
    getError: (key: string) => string | null;
    isDisabled: (config: FilterConfig) => boolean;
    updateFilter: (key: string, value: any) => void;
    updateFilters: (updates: Partial<FilterValues>) => void;
    resetAllFilters: () => void;
    resetFilter: (key: string) => void;
    applyFiltersAction: () => void;
  };
}

@Directive({
  selector: '[appFilterPanel]',
  standalone: false,
  exportAs: 'filterPanel',
})
export class FilterPanelDirective implements OnInit, OnDestroy {
  @Input('appFilterPanelConfig') configs: FilterConfig[] = [];
  @Input('appFilterPanelDebounce') debounceTime: number = 300;
  @Input('appFilterPanelAutoApply') autoApply: boolean = true;

  @Output() filtersChanged = new EventEmitter<ValidFilterValues>();
  @Output() applyFiltersClicked = new EventEmitter<void>();
  @Output() resetFiltersClicked = new EventEmitter<void>();

  private filterService = inject(FilterService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private subscriptions: any[] = [];
  private viewRef: any;
  private updateEffect: any;

  private context: FilterPanelContext = {
    $implicit: {
      filters: [],
      groupedFilters: {},
      values: {},
      validValues: {},
      activeCount: 0,
      hasChanges: false,
      isResetting: false,
      getValue: this.getValue.bind(this),
      getError: this.getError.bind(this),
      isDisabled: this.isDisabled.bind(this),
      updateFilter: this.updateFilter.bind(this),
      updateFilters: this.updateFilters.bind(this),
      resetAllFilters: this.resetAllFilters.bind(this),
      resetFilter: this.resetFilter.bind(this),
      applyFiltersAction: this.applyFiltersAction.bind(this),
    },
  };

  constructor() {
    this.updateEffect = effect(() => {
      const filters = this.filterService.sortedConfigs();
      const groupedFilters = this.filterService.groupedConfigs();
      const values = this.filterService.values();
      const validValues = this.filterService.validValues();
      const activeCount = this.filterService.activeFiltersCount();
      const hasChanges = this.filterService.hasChanges();
      const isResetting = this.filterService.isResetting();

      untracked(() => {
        this.context.$implicit.filters = filters;
        this.context.$implicit.groupedFilters = groupedFilters;
        this.context.$implicit.values = values;
        this.context.$implicit.validValues = validValues;
        this.context.$implicit.activeCount = activeCount;
        this.context.$implicit.hasChanges = hasChanges;
        this.context.$implicit.isResetting = isResetting;
        this.render();
      });
    });
  }

  ngOnInit() {
    // Устанавливаем конфиги после инициализации
    this.filterService.setConfigs(this.configs);

    // Подписываемся на изменения для эмита (если включён авто-применение)
    if (this.autoApply) {
      const sub = this.filterService.changes$.subscribe((validFilters) => {
        this.filtersChanged.emit(validFilters);
      });
      this.subscriptions.push(sub);
    }
  }

  private render(): void {
    this.viewContainer.clear();
    this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, this.context);
  }

  // Публичные методы (доступны через контекст)
  getValue(key: string): any {
    return this.filterService.getValue(key);
  }

  getError(key: string): string | null {
    return this.filterService.getError(key);
  }

  isDisabled(config: FilterConfig): boolean {
    if (config.disabled) return true;

    if (config.dependsOn) {
      const dependsOnArray = Array.isArray(config.dependsOn)
        ? config.dependsOn
        : [config.dependsOn];

      for (const dependKey of dependsOnArray) {
        const dependValue = this.getValue(dependKey);

        if (config.dependsOnValue !== undefined) {
          if (dependValue !== config.dependsOnValue) return true;
        } else {
          if (!dependValue && dependValue !== false && dependValue !== 0) return true;
        }
      }
    }

    return false;
  }

  updateFilter(key: string, value: any): void {
    this.filterService.updateFilter(key, value);
  }

  updateFilters(updates: Partial<FilterValues>): void {
    this.filterService.updateFilters(updates);
  }

  resetAllFilters(): void {
    this.filterService.resetAll();
    this.resetFiltersClicked.emit();
  }

  resetFilter(key: string): void {
    this.filterService.resetFilter(key);
  }

  applyFiltersAction(): void {
    const validFilters = this.filterService.validValues();
    this.filtersChanged.emit(validFilters);
    this.applyFiltersClicked.emit();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });

    if (this.updateEffect) {
      this.updateEffect.destroy();
    }

    if (this.viewRef) {
      this.viewRef.destroy();
    }
  }
}
