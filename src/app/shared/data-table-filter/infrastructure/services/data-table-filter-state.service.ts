import { inject, Injectable, signal } from '@angular/core';
import { FilterService } from '../../../directives/filter-panel/infrastructure/services/filter.service';
import type { DataTableFilterRule } from '../interfaces/data-table-filter.interfaces';
import {
  dataTableFilterConfigs,
  FILTER_MAX_EXPLICIT_VALUES,
} from '../constants/data-table-filter.constants';

@Injectable()
export class DataTableFilterState {
  readonly filters = inject(FilterService);
  readonly error = signal('');

  open(numeric: boolean, rule?: DataTableFilterRule): void {
    this.filters.setConfigs(dataTableFilterConfigs(numeric));
    if (rule) {
      const draft = structuredClone(rule);
      if (draft.values && draft.excluded_values?.length) {
        draft.values = draft.values.filter((value) => !draft.excluded_values!.includes(value));
        delete draft.excluded_values;
      }
      this.filters.updateFilters(draft);
    }
    this.error.set('');
  }

  values(): string[] | null {
    return this.filters.getValue('values') as string[] | null;
  }

  excluded(): string[] {
    return (this.filters.getValue('excluded_values') as string[]) || [];
  }

  checked(value: string): boolean {
    const values = this.values();
    return values === null ? !this.excluded().includes(value) : values.includes(value);
  }

  all(checked: boolean): void {
    this.filters.updateFilters({ values: checked ? null : [], excluded_values: [] });
    this.error.set('');
  }

  toggle(value: string, checked: boolean): void {
    const all = this.values() === null;
    const selected = new Set(all ? this.excluded() : this.values()!);
    if (checked !== all) selected.add(value);
    else selected.delete(value);
    this.filters.updateFilter(all ? 'excluded_values' : 'values', [...selected]);
    this.error.set('');
  }

  selectFound(found: string[]): void {
    this.filters.updateFilters({
      values: [...new Set([...(this.values() || []), ...found])],
      excluded_values: [],
    });
    this.error.set('');
  }

  apply(
    options: string[],
    complete: boolean,
    allowEmpty: boolean,
  ): DataTableFilterRule | null | undefined {
    if (!this.filters.isValid('min') || !this.filters.isValid('max')) {
      this.error.set('Проверьте числовой диапазон.');
      return undefined;
    }
    let values = this.values();
    const excluded = values === null ? this.excluded() : [];
    if (
      !allowEmpty &&
      (values?.length === 0 ||
        (complete && options.length > 0 && options.every((value) => !this.checked(value))))
    ) {
      this.error.set('Выберите значения или отметьте «Все значения».');
      return undefined;
    }
    if (
      (values?.length || 0) + excluded.length > FILTER_MAX_EXPLICIT_VALUES ||
      JSON.stringify({ values, excluded }).length > 16000
    ) {
      this.error.set('Слишком много значений. Уточните поиск или используйте условие «Содержит».');
      return undefined;
    }
    if (
      complete &&
      values?.length &&
      options.length &&
      options.every((value) => values!.includes(value))
    )
      values = null;
    const rule: DataTableFilterRule = {
      values,
      ...(excluded.length ? { excluded_values: excluded } : {}),
      text: String(this.filters.getValue('text') || '').trim(),
      operator: this.filters.getValue('operator') || 'contains',
      min: String(this.filters.getValue('min') || '')
        .trim()
        .replace(',', '.'),
      max: String(this.filters.getValue('max') || '')
        .trim()
        .replace(',', '.'),
    };
    return values !== null || excluded.length || rule.text || rule.min || rule.max ? rule : null;
  }
}
