import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import type { FilterConfig } from '../../../../shared/directives/filter-panel/infrastructure/interfaces/filter.interfaces';
import type { PricingQuery } from '../../infrastructure/interfaces/pricing-query.interfaces';
import { pricingScopeFilters } from '../../infrastructure/utils/pricing-query.utils';
import type {
  PriceColumnChange,
  PriceColumnFilter,
} from './infrastructure/interfaces/pricing-column-filter.interfaces';
import { priceColumns } from './infrastructure/utils/pricing-column-filter.utils';
import {
  PRICING_COLUMN_DEFAULT,
  PRICING_COLUMN_OPERATORS,
} from './infrastructure/constants/pricing-column-filter.constants';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pricing-column-filter',
  providers: [FilterService],
  templateUrl: './pricing-column-filter.component.html',
  styleUrl: './pricing-column-filter.component.css',
})
export class PricingColumnFilter {
  readonly field = input.required<string>();
  readonly label = input.required<string>();
  readonly numeric = input(false);
  readonly query = input.required<PricingQuery>();
  readonly changed = output<PriceColumnChange>();
  readonly opened = signal(false);
  readonly options = signal<string[]>([]);
  readonly filters = inject(FilterService);
  readonly selected = computed(() => new Set<string>(this.filters.getValue('values') || []));
  readonly all = computed(() => this.filters.getValue('all') !== false);
  readonly busy = signal(false);
  readonly error = signal('');
  search = '';
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly show = effect(() => {
    const dialog = this.dialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  });

  active() {
    return !!priceColumns(this.query().column_filters)[this.field()];
  }

  private configure(options: string[]) {
    const validBound = (value: string) =>
      value === '' || Number.isFinite(Number(value.replace(',', '.')));
    const configs: FilterConfig[] = [
      {
        key: 'operator',
        label: 'Условие',
        type: 'select',
        order: 0,
        defaultValue: 'contains',
        options: PRICING_COLUMN_OPERATORS,
      },
      { key: 'text', label: 'Текст условия', type: 'text', order: 1, defaultValue: '' },
      {
        key: 'values',
        label: 'Значения',
        type: 'multiselect',
        order: 2,
        defaultValue: [],
        options: options.map((value) => ({
          value,
          label: value === '__empty__' ? '(Пусто / нет данных)' : value,
        })),
      },
      {
        key: 'all',
        label: 'Все значения',
        type: 'boolean',
        order: 3,
        hidden: true,
        defaultValue: true,
      },
      {
        key: 'min',
        label: 'От',
        type: 'text',
        order: 4,
        defaultValue: '',
        hidden: !this.numeric(),
        validation: validBound,
      },
      {
        key: 'max',
        label: 'До',
        type: 'text',
        order: 5,
        defaultValue: '',
        hidden: !this.numeric(),
        validation: (value, all) =>
          validBound(value) &&
          (!value ||
            !all?.['min'] ||
            Number(all['min'].replace(',', '.')) <= Number(value.replace(',', '.'))),
      },
    ];
    this.filters.setConfigs(configs);
  }

  open() {
    const draft = structuredClone(
      priceColumns(this.query().column_filters)[this.field()] || PRICING_COLUMN_DEFAULT,
    );
    this.configure([]);
    this.filters.updateFilters({ ...draft, all: !draft.values.length });
    this.options.set([]);
    this.search = '';
    this.error.set('');
    this.opened.set(true);
    this.busy.set(true);
    this.api
      .pricingColumnValues(this.field(), pricingScopeFilters(this.query()))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (response) => {
          const current = { ...this.filters.values() };
          const options = [...new Set([...response.values, ...draft.values])];
          this.options.set(options);
          this.configure(options);
          this.filters.updateFilters({
            ...current,
            values: current['all'] ? options : current['values'],
          });
          this.busy.set(false);
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }

  found() {
    const query = this.search.toLocaleLowerCase('ru').replaceAll('ё', 'е');
    return this.options().filter((value) =>
      (value === '__empty__' ? '(Пусто / нет данных)' : value)
        .toLocaleLowerCase('ru')
        .replaceAll('ё', 'е')
        .includes(query),
    );
  }

  valuesChanged(values: string[] | null) {
    if (!this.options().length) return;
    const selected = new Set(values || []);
    const all = this.options().every((value) => selected.has(value));
    if (this.all() !== all) this.filters.updateFilter('all', all);
  }

  toggleAll(value: boolean) {
    this.filters.updateFilters({ all: value, values: value ? this.options() : [] });
  }

  toggle(value: string, checked: boolean) {
    const selected = new Set(this.selected());
    checked ? selected.add(value) : selected.delete(value);
    this.filters.updateFilters({
      values: [...selected],
      all: this.options().length > 0 && this.options().every((value) => selected.has(value)),
    });
  }

  selectFound() {
    const selected = new Set([...(this.all() ? [] : this.selected()), ...this.found()]);
    this.filters.updateFilters({
      values: [...selected],
      all: this.options().length > 0 && this.options().every((value) => selected.has(value)),
    });
  }

  reset() {
    this.filters.resetAll();
    this.changed.emit({ field: this.field(), value: null });
    this.opened.set(false);
  }

  apply() {
    if (!this.all() && !this.selected().size) {
      this.error.set('Выберите значения или отметьте «Все значения».');
      return;
    }
    if (!this.filters.isValid('min') || !this.filters.isValid('max')) {
      this.error.set('Проверьте диапазон от и до.');
      return;
    }
    const value: PriceColumnFilter = {
      values: this.all() ? [] : [...this.selected()],
      text: this.filters.getValue('text'),
      operator: this.filters.getValue('operator') || 'contains',
      min: this.filters.getValue('min').replace(',', '.'),
      max: this.filters.getValue('max').replace(',', '.'),
    };
    this.changed.emit({
      field: this.field(),
      value: value.values.length || value.text || value.min || value.max ? value : null,
    });
    this.opened.set(false);
  }
}
