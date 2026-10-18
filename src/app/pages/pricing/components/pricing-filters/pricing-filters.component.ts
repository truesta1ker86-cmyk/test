import {
  PRICING_FILTERS_FILTER_OPTIONS_5,
  PRICING_FILTERS_FILTER_OPTIONS_6,
  PRICING_FILTERS_FILTER_OPTIONS_8,
} from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  PRICING_FILTERS_CONDITION_FIELDS,
  PRICING_FILTER_SCHEMES,
} from './infrastructure/constants/pricing-filters.constants';
import type { PricingFilterValues } from '../../../../core/infrastructure/interfaces/contracts.interfaces';
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
import type { PricingQuery } from '../../infrastructure/interfaces/pricing-query.interfaces';
import { parsePricingQuery, facetValues } from '../../infrastructure/utils/pricing-query.utils';
import { pricingFacetFields } from '../../infrastructure/constants/pricing-query.constants';
import { priceColumns } from '../pricing-column-filter/infrastructure/utils/pricing-column-filter.utils';
import type { PricingCondition } from './infrastructure/interfaces/pricing-filters.interfaces';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-pricing-filters',

  templateUrl: './pricing-filters.component.html',
  styleUrls: [
    '../../../stocks/components/inventory/inventory-filter/inventory-filter.component.css',
    '../../infrastructure/styles/pricing-workflow.css',
  ],
})
export class PricingFilters {
  readonly query = input.required<PricingQuery>();
  readonly facets = input<Record<string, string[]>>({});
  readonly choices = input<PricingFilterValues['fields']>({});
  readonly canManage = input(false);
  readonly applied = output<PricingQuery>();
  readonly opened = signal(false);
  readonly draft = signal(parsePricingQuery({}));
  readonly error = signal('');
  readonly message = signal('');
  readonly busy = signal(false);
  readonly conditions = signal<PricingCondition[]>([]);
  readonly fields = pricingFacetFields;
  readonly facetValues = facetValues;
  readonly conditionFields = PRICING_FILTERS_CONDITION_FIELDS;
  readonly views = signal<{ id: string; name: string; query: PricingQuery; default: boolean }[]>(
    [],
  );
  viewId = '';
  viewName = '';
  defaultView = false;
  readonly activeCount = computed(
    () =>
      pricingFacetFields.filter(([key]) => !!this.query()[key]).length +
      Number(!!this.query().article) +
      Number(!!this.query().name) +
      Number(!!this.query().margin_min || !!this.query().margin_max) +
      Number(!!this.query().promo_below_minimum) +
      Number(!!this.query().conditions && this.query().conditions !== '[]') +
      Object.keys(priceColumns(this.query().column_filters)).length,
  );
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  private readonly show = effect(() => {
    const d = this.dialog()?.nativeElement;
    if (d && !d.open) d.showModal();
  });
  open() {
    this.draft.set(structuredClone(this.query()));
    try {
      this.conditions.set(JSON.parse(this.query().conditions || '[]'));
    } catch {
      this.conditions.set([]);
    }
    this.error.set('');
    this.opened.set(true);
    this.loadViews();
  }
  set(key: keyof PricingQuery, value: string) {
    this.draft.update((q) => ({ ...q, [key]: value }));
  }
  choice(key: keyof PricingQuery, values: string[]) {
    this.set(key, values.length ? JSON.stringify(values) : '');
  }
  options(key: string) {
    const options =
      this.choices()[key] || (this.facets()[key] || []).map((value) => ({ value, label: value }));
    return !options.length && ['plan_ship_method', 'ship_method'].includes(key)
      ? PRICING_FILTER_SCHEMES
      : options;
  }
  addCondition() {
    this.conditions.update((rows) => [...rows, { field: 'fin_type', operator: 'eq', value: '' }]);
  }
  changeCondition(index: number, key: keyof PricingCondition, value: string) {
    this.conditions.update((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    );
  }
  removeCondition(index: number) {
    this.conditions.update((rows) => rows.filter((_, i) => i !== index));
  }
  value() {
    const q = {
      ...this.draft(),
      conditions: this.conditions().length ? JSON.stringify(this.conditions()) : '',
      page: 1,
    };
    for (const key of ['margin_min', 'margin_max'] as const)
      if (q[key] && !Number.isFinite(Number(q[key])))
        throw new Error('Проверьте диапазон целевой маржи.');
    if (q.margin_min && q.margin_max && Number(q.margin_min) > Number(q.margin_max))
      throw new Error('Маржа «от» не должна превышать маржу «до».');
    for (const c of this.conditions())
      if (!['empty', 'not_empty'].includes(c.operator) && !c.value.trim())
        throw new Error('Заполните значение условия отбора.');
    return q;
  }
  apply() {
    try {
      this.applied.emit(this.value());
      this.opened.set(false);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
  reset() {
    const q = parsePricingQuery({});
    q.results = this.query().results;
    q.page_size = this.query().page_size;
    this.draft.set(q);
    this.conditions.set([]);
    this.applied.emit(q);
  }
  loadViews() {
    this.api
      .pricingViews()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.views.set(r.items),
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  useView() {
    const v = this.views().find((v) => v.id === this.viewId);
    if (!v) return;
    this.viewName = v.name;
    this.defaultView = v.default;
    this.draft.set({ ...parsePricingQuery({}), ...v.query });
    this.conditions.set(JSON.parse(v.query.conditions || '[]'));
  }
  saveView(update = false) {
    try {
      const query = this.value();
      if (!this.viewName.trim()) throw new Error('Укажите название отбора.');
      this.busy.set(true);
      this.api
        .savePricingView({
          ...(update ? { id: this.viewId } : {}),
          name: this.viewName.trim(),
          query,
          default: this.defaultView,
        })
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: () => {
            this.busy.set(false);
            this.message.set('Отбор сохранён локально.');
            this.loadViews();
          },
          error: (e) => {
            this.busy.set(false);
            this.error.set(errorMessage(e));
          },
        });
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
  deleteView() {
    if (!this.viewId) return;
    this.busy.set(true);
    this.api
      .deletePricingView(this.viewId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.viewId = '';
          this.loadViews();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }

  promoBelowMinimumOptions() {
    return PRICING_FILTERS_FILTER_OPTIONS_5;
  }
  logicOptions() {
    return PRICING_FILTERS_FILTER_OPTIONS_6;
  }
  conditionFieldOptions() {
    return [
      ...this.conditionFields.flatMap((f) => [{ value: String(f.key), label: String(f.label) }]),
    ];
  }
  conditionOperatorOptions() {
    return PRICING_FILTERS_FILTER_OPTIONS_8;
  }
  viewIdOptions() {
    return [
      { value: '', label: 'Выберите отбор' },
      ...this.views().flatMap((v) => [
        { value: String(v.id), label: String(v.name) + String(v.default ? ' · по умолчанию' : '') },
      ]),
    ];
  }
}
