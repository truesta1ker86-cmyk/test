import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  PROFIT_SUMMARY_TABLE_COLUMNS1,
  PROFIT_SUMMARY_COLUMNS,
} from './infrastructure/constants/profit-summary.constants';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { currency } from '../../../orders/infrastructure/utils/format.utils';
import { ColumnChange, ColumnRules } from '../../../../shared/directives/filter-panel/filter-panel';
import { date } from '../../../../core/infrastructure/utils/format.utils';
import type { ProfitItem } from './infrastructure/types/profit-summary.types';
import { number, text } from './infrastructure/utils/profit-summary.utils';
import {
  selectColumns,
  columnChoices,
} from '../../../../shared/filtering/infrastructure/utils/column-selection.utils';
import type { Entity } from '../../../../shared/filtering/infrastructure/types/filter.types';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-profit-summary',

  templateUrl: './profit-summary.component.html',
  styleUrl: './profit-summary.component.css',
})
export class ProfitSummary {
  tableColumns1(): DataTableColumn[] {
    return PROFIT_SUMMARY_TABLE_COLUMNS1;
  }

  readonly report = input.required<Record<string, unknown>>();
  readonly query = input('');
  readonly externalFilters = input(false);
  readonly columnRules = input<ColumnRules>({});
  readonly columnOptions = input<Record<string, string[]>>({});
  readonly filteringApplied = input(false);
  readonly columnChanged = output<ColumnChange>();
  readonly category = signal('');
  readonly productType = signal('');
  readonly expanded = signal(new Set<ProfitItem>());
  readonly sortKey = signal('product_name');
  readonly descending = signal(false);
  readonly items = computed<ProfitItem[]>(() =>
    Array.isArray(this.report()['items']) ? (this.report()['items'] as ProfitItem[]) : [],
  );
  readonly categories = computed(() =>
    [...new Set(this.items().map((i) => this.categoryName(i)))].sort((a, b) =>
      a.localeCompare(b, 'ru'),
    ),
  );
  readonly types = computed(() =>
    [
      ...new Set(
        this.items()
          .filter((i) => !this.category() || this.categoryName(i) === this.category())
          .map((i) => this.typeName(i)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'ru')),
  );
  readonly baseVisible = computed(() =>
    this.items().filter(
      (i) =>
        (!this.category() || this.categoryName(i) === this.category()) &&
        (!this.productType() || this.typeName(i) === this.productType()) &&
        this.query()
          .toLocaleLowerCase()
          .trim()
          .split(/\s+/)
          .every((term) =>
            [this.name(i), i['offer_id'], this.categoryName(i), this.typeName(i)]
              .join(' ')
              .toLocaleLowerCase()
              .includes(term),
          ),
    ),
  );
  columnValues(item: ProfitItem): Entity {
    const values: Entity = {};
    for (const [key] of PROFIT_SUMMARY_COLUMNS) {
      const value = item[key];
      values[key] =
        key === 'product_name'
          ? [this.name(item), item['offer_id']].filter(Boolean).join(' · ')
          : key === 'report_category'
            ? this.categoryName(item)
            : key === 'report_type'
              ? this.typeName(item)
              : typeof value === 'string' || typeof value === 'number'
                ? value
                : null;
    }
    return values;
  }
  readonly visible = computed(() =>
    this.filteringApplied()
      ? this.baseVisible()
      : selectColumns(this.baseVisible(), this.columnRules(), (item) => this.columnValues(item)),
  );
  readonly filterOptions = computed(() => ({
    ...columnChoices(this.baseVisible(), this.columnRules(), (item) => this.columnValues(item)),
    ...this.columnOptions(),
  }));
  readonly sorted = computed(() =>
    [...this.visible()].sort((a, b) => {
      const key = this.sortKey();
      const value =
        key === 'product_name'
          ? this.name(a).localeCompare(this.name(b), 'ru')
          : key === 'report_category'
            ? this.categoryName(a).localeCompare(this.categoryName(b), 'ru')
            : key === 'report_type'
              ? this.typeName(a).localeCompare(this.typeName(b), 'ru')
              : number(a[key]) - number(b[key]);
      return this.descending() ? -value : value;
    }),
  );
  readonly incomplete = computed(
    () => this.visible().filter((i) => i['is_complete'] !== true).length,
  );
  readonly metrics = computed(() => [
    { label: 'Продажи и возвраты', value: this.total('revenue') },
    { label: 'Начисления маркетплейса', value: this.marketplaceCosts() },
    { label: 'Положительные начисления', value: this.total('other_income') },
    ...(Math.abs(this.total('distribution_adjustment')) >= 0.005
      ? [{ label: 'Распределение начислений', value: this.total('distribution_adjustment') }]
      : []),
    { label: 'Итого маркетплейса', value: this.total('ozon_accrual') },
    { label: 'Себестоимость', value: -this.total('cost') },
    { label: 'Валовая прибыль', value: this.total('gross_profit') },
    { label: 'Налог', value: -this.total('tax') },
    { label: 'Чистая прибыль', value: this.total('profit') },
  ]);
  readonly columns = PROFIT_SUMMARY_COLUMNS;
  readonly money = currency;
  readonly num = number;
  readonly reconciliation = computed(() => {
    const raw = this.report()['reconciliation'];
    if (!raw || typeof raw !== 'object') return 'Нет данных сверки операций за период.';
    const r = raw as Record<string, unknown>;
    if (r['is_balanced'] !== true)
      return (
        'Внутренняя сверка операций не сошлась: разница ' +
        currency(text(r['difference']) || null) +
        '.'
      );
    const sync = this.report()['sync'] as Record<string, unknown> | undefined;
    if (sync?.['state'] === 'success' && sync['last_success_at'])
      return (
        'Внутренняя сверка операций сошлась. Последнее успешное обновление периода: ' +
        date(text(sync['last_success_at'])) +
        '.'
      );
    return 'Внутренняя сверка операций за период сошлась. Показан сохранённый снимок; выбранный период не обновлялся из Ozon.';
  });
  formatMargin(value: number | null) {
    return value === null
      ? '—'
      : value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' %';
  }
  expense(value: unknown) {
    return -number(value) || 0;
  }
  constructor() {
    effect(() => {
      this.items();
      this.expanded.set(new Set());
    });
  }
  name(i: ProfitItem) {
    return text(i['product_name'] || i['name'] || i['offer_id'] || 'Общие операции');
  }
  categoryName(i: ProfitItem) {
    return text(i['report_category'] || 'Без категории');
  }
  typeName(i: ProfitItem) {
    return text(i['report_type'] || 'Без типа');
  }
  total(key: string) {
    return this.visible().reduce((sum, i) => sum + number(i[key]), 0);
  }
  marketplaceCosts() {
    return -['ozon_commission', 'acquiring', 'logistics', 'other_expenses'].reduce(
      (sum, key) => sum + this.total(key),
      0,
    );
  }
  costValue(i: ProfitItem) {
    return i['has_cost_price'] ? -number(i['cost']) : null;
  }
  marginValue(i: ProfitItem) {
    return i['is_complete'] === true && i['margin_pct'] != null ? number(i['margin_pct']) : null;
  }
  setCategory(value: string) {
    this.category.set(value);
    this.productType.set('');
  }
  sort(key: string) {
    this.descending.set(this.sortKey() === key ? !this.descending() : false);
    this.sortKey.set(key);
  }
  toggle(item: ProfitItem) {
    const next = new Set(this.expanded());
    next.has(item) ? next.delete(item) : next.add(item);
    this.expanded.set(next);
  }
  breakdown(i: ProfitItem) {
    return [
      ['Доставки', number(i['sales_revenue'])],
      ['Возвраты', -number(i['returns'])],
      ['Комиссия', -number(i['ozon_commission'])],
      ['Эквайринг', -number(i['acquiring'])],
      ['Логистика', -number(i['logistics'])],
      ['Прочие расходы', -number(i['other_expenses'])],
      ['Положительные начисления', number(i['other_income'])],
      ['Распределение начислений', number(i['distribution_adjustment'])],
      ['Валовая прибыль', number(i['gross_profit'])],
      ['Налог', -number(i['tax'])],
      ['Чистая прибыль', number(i['profit'])],
    ].map(([label, value]) => ({ label: String(label), value: Number(value) }));
  }

  categoryOptions() {
    return [
      { value: '', label: 'Все категории' },
      ...this.categories().flatMap((c) => [{ value: String(c), label: String(c) }]),
    ];
  }
  productTypeOptions() {
    return [
      { value: '', label: 'Все типы' },
      ...this.types().flatMap((t) => [{ value: String(t), label: String(t) }]),
    ];
  }
}
