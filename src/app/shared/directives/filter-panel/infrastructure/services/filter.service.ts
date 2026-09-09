// filter.service.ts
import { Injectable, signal, computed, effect, untracked, DestroyRef, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FilterConfig, FilterValues, ValidFilterValues } from '../models/filter.model';

@Injectable()
export class FilterService {
  private destroyRef = inject(DestroyRef);

  // Сигналы
  private configsSignal = signal<FilterConfig[]>([]);
  private valuesSignal = signal<FilterValues>({});
  private isResettingSignal = signal<boolean>(false);

  // Публичные сигналы
  public configs = this.configsSignal.asReadonly();
  public values = this.valuesSignal.asReadonly();
  public isResetting = this.isResettingSignal.asReadonly();

  // Computed: отсортированные конфиги
  public sortedConfigs = computed(() => {
    return this.configsSignal()
      .filter((c) => !c.hidden)
      .sort((a, b) => a.order - b.order);
  });

  // Computed: сгруппированные конфиги
  public groupedConfigs = computed(() => {
    const configs = this.sortedConfigs();
    const groups: Record<string, FilterConfig[]> = {};

    for (const config of configs) {
      const group = config.group || '__default__';
      if (!groups[group]) groups[group] = [];
      groups[group].push(config);
    }

    return groups;
  });

  // Computed: валидные значения
  public validValues = computed<ValidFilterValues>(() => {
    const values = this.valuesSignal();
    const configs = this.configsSignal();
    const result: ValidFilterValues = {};

    for (const config of configs) {
      const value = values[config.key];

      if (value === undefined || value === null) continue;
      if (config.validation && !config.validation(value, values)) continue;
      if (config.defaultValue !== undefined && value === config.defaultValue) continue;

      result[config.key] = value;
    }

    return result;
  });

  // Computed: количество активных фильтров
  public activeFiltersCount = computed(() => {
    return Object.keys(this.validValues()).length;
  });

  // Computed: есть ли изменения
  public hasChanges = computed(() => {
    const values = this.valuesSignal();
    const configs = this.configsSignal();

    for (const config of configs) {
      const currentValue = values[config.key];
      const defaultValue = config.defaultValue;

      if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
        return true;
      }
    }
    return false;
  });

  // Subject для стрима изменений
  private changesSubject = new BehaviorSubject<ValidFilterValues>({});
  public changes$ = this.changesSubject.asObservable().pipe(
    debounceTime(300),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  // Эффект для обновления стрима
  private changesEffect = effect(() => {
    const valid = this.validValues();
    untracked(() => {
      this.changesSubject.next(valid);
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.changesSubject.complete();
    });
  }

  setConfigs(configs: FilterConfig[]): void {
    const sorted = configs.sort((a, b) => a.order - b.order);
    this.configsSignal.set(sorted);

    const defaults: FilterValues = {};
    for (const config of sorted) {
      if (config.defaultValue !== undefined) {
        defaults[config.key] = config.defaultValue;
      }
    }
    this.valuesSignal.set(defaults);
  }

  updateFilter(key: string, value: any): void {
    const configs = this.configsSignal();
    const config = configs.find((c) => c.key === key);
    if (!config) return;

    // Проверка зависимостей
    if (config.dependsOn) {
      const currentValues = this.valuesSignal();
      const dependsOnArray = Array.isArray(config.dependsOn)
        ? config.dependsOn
        : [config.dependsOn];

      for (const dependKey of dependsOnArray) {
        const dependValue = currentValues[dependKey];

        if (config.dependsOnValue !== undefined) {
          if (dependValue !== config.dependsOnValue) return;
        } else {
          if (!dependValue && dependValue !== false && dependValue !== 0 && dependValue !== '') {
            return;
          }
        }
      }
    }

    this.valuesSignal.update((values) => ({
      ...values,
      [key]: value,
    }));
  }

  updateFilters(updates: Partial<FilterValues>): void {
    this.valuesSignal.update((values) => ({
      ...values,
      ...updates,
    }));
  }

  resetAll(): void {
    this.isResettingSignal.set(true);

    const configs = this.configsSignal();
    const defaults: FilterValues = {};
    for (const config of configs) {
      if (config.defaultValue !== undefined) {
        defaults[config.key] = config.defaultValue;
      }
    }
    this.valuesSignal.set(defaults);

    setTimeout(() => {
      this.isResettingSignal.set(false);
    }, 100);
  }

  resetFilter(key: string): void {
    const configs = this.configsSignal();
    const config = configs.find((c) => c.key === key);
    if (config && config.defaultValue !== undefined) {
      this.updateFilter(key, config.defaultValue);
    }
  }

  getValue(key: string): any {
    return this.valuesSignal()[key];
  }

  getConfig(key: string): FilterConfig | undefined {
    return this.configsSignal().find((c) => c.key === key);
  }

  isValid(key: string): boolean {
    const config = this.getConfig(key);
    if (!config || !config.validation) return true;
    const value = this.getValue(key);
    const allValues = this.valuesSignal();
    return config.validation(value, allValues);
  }

  getError(key: string): string | null {
    const config = this.getConfig(key);
    if (!config || !config.validation) return null;
    const value = this.getValue(key);
    const allValues = this.valuesSignal();

    if (!config.validation(value, allValues)) {
      return config.errorMessage || 'Некорректное значение';
    }
    return null;
  }

  isDisabled(key: string): boolean {
    const config = this.getConfig(key);
    if (!config || config.disabled) return true;
    
    if (config.dependsOn) {
      const dependsOnArray = Array.isArray(config.dependsOn) ? config.dependsOn : [config.dependsOn];
      for (const dependKey of dependsOnArray) {
        const dependValue = this.getValue(dependKey);
        if (!dependValue && dependValue !== false && dependValue !== 0) {
          return true;
        }
      }
    }
    
    return false;
  }
}
