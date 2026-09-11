import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import {
  FilterConfig,
  FilterValues,
  ValidFilterValues,
} from './infrastructure/models/filter.model';
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
export class FilterPanelDirective implements OnInit, OnDestroy, OnChanges {
  @Input('appFilterPanel') configs: FilterConfig[] = [];
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

  ngOnInit(): void {
    // Устанавливаем конфиги в сервис
    this.filterService.setConfigs(this.configs);

    // Подписываемся на изменения валидных фильтров для обновления контекста
    const sub = this.filterService.changes$.subscribe(() => {
      this.updateContext();
    });
    this.subscriptions.push(sub);

    // Если autoApply включён, эмитим изменения наружу
    if (this.autoApply) {
      const autoSub = this.filterService.changes$.subscribe((validFilters) => {
        this.filtersChanged.emit(validFilters);
      });
      this.subscriptions.push(autoSub);
    }

    // Первоначальный рендеринг
    this.updateContext();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Если изменилась конфигурация, обновляем сервис и контекст
    if (changes['configs']) {
      this.filterService.setConfigs(this.configs);
      this.updateContext();
    }
  }

  private updateContext(): void {
    this.context.$implicit.filters = this.filterService.sortedConfigs();
    this.context.$implicit.groupedFilters = this.filterService.groupedConfigs();
    this.context.$implicit.values = this.filterService.values();
    this.context.$implicit.validValues = this.filterService.validValues();
    this.context.$implicit.activeCount = this.filterService.activeFiltersCount();
    this.context.$implicit.hasChanges = this.filterService.hasChanges();
    this.context.$implicit.isResetting = this.filterService.isResetting();

    this.render();
  }

  private render(): void {
    this.viewContainer.clear();
    this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, this.context);
  }

  // ========== Публичные методы (доступны через контекст) ==========

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

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });

    if (this.viewRef) {
      this.viewRef.destroy();
    }
  }
}
