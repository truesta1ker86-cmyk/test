import { FINANCE_PAGE_FILTER_OPTIONS_10 } from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  FINANCE_PAGE_API_ROOT,
  FINANCE_PAGE_TABS,
  FINANCE_PAGE_FACET_FIELDS,
  FINANCE_PAGE_TABLE_COLUMNS1,
  FINANCE_MARKET_PAGE_SIZE,
} from './infrastructure/constants/finance-page.constants';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, catchError, map, of, switchMap, tap } from 'rxjs';
import type {
  Column,
  ReportRow,
} from '../report-table/infrastructure/interfaces/report-table.interfaces';
import type { ProductPreviewData } from '../../../../shared/product-preview/infrastructure/interfaces/product-name.interfaces';
import {
  errorMessage,
  downloadErrorMessage,
} from '../../../../core/infrastructure/utils/api.utils';
import { date } from '../../../../core/infrastructure/utils/format.utils';
import { currency, download } from '../../../orders/infrastructure/utils/format.utils';
import {
  ColumnChange,
  parseColumnRules,
} from '../../../../shared/directives/filter-panel/filter-panel';
import type { FinanceSelectionStats } from '../../infrastructure/interfaces/finance-cell-selection.interfaces';
import type { Entry } from './infrastructure/types/finance-page.types';
import type { FinanceData } from './infrastructure/interfaces/finance-page.interfaces';
import { financeProductOptions } from './infrastructure/utils/finance-product-filter.utils';
import {
  array,
  object,
  text,
  amount,
  calendarDate,
  validFinanceDates,
  monthLabel,
} from './infrastructure/utils/finance-page.utils';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-finance-page',

  templateUrl: './finance-page.component.html',
  styleUrls: [
    '../../../stocks/components/stocks-page/stocks-page.component.css',
    './finance-page.component.css',
  ],
})
export class FinancePage {
  tableColumns1(): DataTableColumn[] {
    return FINANCE_PAGE_TABLE_COLUMNS1;
  }

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly root = FINANCE_PAGE_API_ROOT;
  readonly tabs = FINANCE_PAGE_TABS;
  readonly data = signal<FinanceData | null>(null);
  readonly view = signal('profit');
  readonly marketPage = signal(1);
  readonly marketPageSize = FINANCE_MARKET_PAGE_SIZE;
  readonly marketPageCount = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / this.marketPageSize)),
  );
  readonly currentMarketPage = computed(() => Math.min(this.marketPage(), this.marketPageCount()));
  readonly displayedRows = computed(() =>
    this.view() === 'market'
      ? this.rows().slice(
          (this.currentMarketPage() - 1) * this.marketPageSize,
          this.currentMarketPage() * this.marketPageSize,
        )
      : this.rows(),
  );
  readonly query = signal({
    start: '',
    end: '',
    q: '',
    operation_type: '',
    category: '',
    product_type: '',
    product: '',
    article: '',
    column_filters: '{}',
    facets: '{}',
    page: 1,
    page_size: 50,
  });
  readonly cellStats = signal<FinanceSelectionStats | null>(null);
  formatSelected(value: number, unit: string) {
    return (
      value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) +
      (unit === 'money'
        ? ' ₽'
        : unit === 'percent'
          ? ' %'
          : unit === 'mixed'
            ? ' · разные единицы'
            : '')
    );
  }
  readonly columnRules = computed(
    () => parseColumnRules(this.query().column_filters)[this.view()] || {},
  );
  readonly columnOptions = computed(
    () => (this.data()?.report['_column_options'] || {}) as Record<string, string[]>,
  );
  readonly products = computed(() => array(this.data()?.report['_filter_products']));
  readonly productView = computed(() =>
    ['profit', 'gross', 'weekly', 'market'].includes(this.view()),
  );
  private readonly productDraft = signal({
    category: '',
    product_type: '',
    product: '',
    facets: '{}',
  });
  get category() {
    return this.productDraft().category;
  }
  set category(value: string) {
    this.productDraft.update((d) => ({ ...d, category: value || '' }));
  }
  get productType() {
    return this.productDraft().product_type;
  }
  set productType(value: string) {
    this.productDraft.update((d) => ({ ...d, product_type: value || '' }));
  }
  get product() {
    return this.productDraft().product;
  }
  set product(value: string) {
    this.productDraft.update((d) => ({ ...d, product: value || '' }));
  }
  get facets() {
    return this.productDraft().facets;
  }
  set facets(value: string) {
    this.productDraft.update((d) => ({ ...d, facets: value || '{}' }));
  }
  private readonly productSelection = computed(() => ({
    ...this.productDraft(),
    q: this.query().q,
    article: this.query().article,
  }));
  article = '';
  columnsFilter = '{}';
  readonly facetFields = FINANCE_PAGE_FACET_FIELDS;
  facetValues(key: string): string[] {
    try {
      return JSON.parse(this.facets)[key] || [];
    } catch {
      return [];
    }
  }
  facetOptions(key: string) {
    return financeProductOptions(this.products(), this.productSelection(), key);
  }
  setFacet(key: string, values: string[]) {
    let facets: Record<string, string[]> = {};
    try {
      facets = JSON.parse(this.facets);
    } catch {}
    if (values.length) facets[key] = values;
    else delete facets[key];
    this.facets = JSON.stringify(facets);
  }
  applyFacets() {
    this.navigate();
  }

  readonly filterCategories = computed(() =>
    financeProductOptions(this.products(), this.productSelection(), 'category').map((o) => o.value),
  );
  filterTypes() {
    return financeProductOptions(this.products(), this.productSelection(), 'product_type').map(
      (o) => o.value,
    );
  }
  filterProducts() {
    const offers = new Set(
      financeProductOptions(this.products(), this.productSelection(), 'product').map(
        (o) => o.value,
      ),
    );
    return this.products().filter((p) => offers.has(text(p['offer_id'])));
  }
  hierarchyChanged(category = false) {
    if (category) this.productType = '';
    this.product = '';
    this.navigate();
  }
  changeColumn(change: ColumnChange) {
    const filters = parseColumnRules(this.query().column_filters),
      view = { ...(filters[this.view()] || {}) };
    if (change.rule) view[change.field] = change.rule;
    else delete view[change.field];
    filters[this.view()] = view;
    this.columnsFilter = JSON.stringify(filters);
    this.navigate();
  }
  resetFilters() {
    this.category = '';
    this.productType = '';
    this.product = '';
    this.article = '';
    this.q = '';
    this.operationType = '';
    this.facets = '{}';
    const filters = parseColumnRules(this.columnsFilter);
    delete filters[this.view()];
    this.columnsFilter = JSON.stringify(filters);
    this.navigate();
  }
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly costEditor = signal<string | null>(null);
  readonly costLoading = signal(false);
  readonly costs = signal<{ offer_id: string; month: string; cost: string; source: string }[]>([]);
  readonly ObjectKeys = Object.keys;
  readonly viewLabel = computed(() => this.tabs.find((t) => t[0] === this.view())?.[1] || 'Отчёт');
  readonly date = date;
  readonly calendarDate = calendarDate;
  readonly currency = currency;
  start = '';
  end = '';
  q = '';
  operationType = '';
  tax = 'usn_6';
  costMonth = new Date().toISOString().slice(0, 7);
  cost = '';
  exportKind = 'summary';
  period = '30';
  setPeriod(days: string) {
    this.period = days;
    if (days === 'custom') return;
    const end = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const start = new Date(end + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() - Number(days) + 1);
    this.start = start.toISOString().slice(0, 10);
    this.end = end;
  }
  readonly totals = computed(() => {
    const t = object(this.data()?.report['totals']);
    const gross = this.view() === 'gross';
    return [
      ['Начислено Ozon', t['ozon_accrual']],
      ['Себестоимость', t['cost']],
      [
        gross ? 'Валовая прибыль' : 'Прибыль',
        gross && this.data()?.report['is_complete'] === false
          ? null
          : t[gross ? 'gross_profit' : 'profit'],
      ],
      ['Налог', t['tax']],
    ]
      .filter(([, value]) => value !== undefined)
      .map(([label, value]) => ({ label: text(label), value: amount(value) }));
  });
  readonly operationTypes = computed(() => array(this.data()?.report['operation_types']).map(text));
  private readonly refresh = new BehaviorSubject(0);
  readonly distribution = computed(() => array(this.data()?.report['distribution']));
  coefficient(value: unknown) {
    return value == null
      ? 'нет базы'
      : Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 6 });
  }
  readonly columns = computed<Column[]>(() => {
    const r = this.data()?.report || {};
    switch (this.view()) {
      case 'profit':
        return [
          { key: 'units_sold', label: 'Продано, шт.', format: 'number' },
          ...this.moneyColumns([
            'sales_revenue',
            'ozon_accrual',
            'cost',
            'ozon_commission',
            'acquiring',
            'logistics',
            'tax',
            'profit',
          ]),
          { key: 'margin_pct', label: 'Маржа', format: 'percent' },
        ];
      case 'gross':
        return [
          { key: 'product_type', label: 'Тип', format: 'text', group: 'Товар' },
          { key: 'offer_id', label: 'Артикул', format: 'text', group: 'Товар' },
          {
            key: 'product_name',
            label: 'Номенклатура / вид начисления',
            format: 'text',
            group: 'Товар',
          },
          ...this.moneyColumns(['ozon_accrual', 'cost', 'gross_profit']),
          { key: 'gross_margin_pct', label: 'Процент валовой', format: 'percent' },
          ...this.moneyColumns(['net_profit']),
          ...array(r['months']).flatMap((m) => [
            {
              key: 'month:' + m['key'] + ':ozon_accrual',
              label: 'Итого маркетплейса',
              group: text(m['key']),
              groupLabel: monthLabel(m),
              format: 'money' as const,
            },
            {
              key: 'month:' + m['key'] + ':cost',
              label: 'Себестоимость',
              group: text(m['key']),
              groupLabel: monthLabel(m),
              format: 'money' as const,
            },
            {
              key: 'month:' + m['key'] + ':gross_profit',
              label: 'Валовая прибыль',
              group: text(m['key']),
              groupLabel: monthLabel(m),
              format: 'money' as const,
            },
            {
              key: 'month:' + m['key'] + ':gross_margin_pct',
              label: 'Процент валовой',
              group: text(m['key']),
              groupLabel: monthLabel(m),
              format: 'percent' as const,
            },
          ]),
        ];
      case 'weekly':
        return [
          { key: 'product_name', label: 'Номенклатура / артикул', format: 'text', group: 'Товар' },
          { key: 'product_type', label: 'Тип', format: 'text', group: 'Товар' },
          ...array(r['periods']).flatMap((p, i) => [
            {
              key: i + ':orders',
              label: 'Заказы, ₽',
              group: calendarDate(p['from']) + ' — ' + calendarDate(p['to']),
              format: 'money' as const,
            },
            {
              key: i + ':dynamics',
              label: 'Динамика',
              group: calendarDate(p['from']) + ' — ' + calendarDate(p['to']),
              format: 'percent' as const,
            },
            {
              key: i + ':cancelled',
              label: 'Отмены',
              group: calendarDate(p['from']) + ' — ' + calendarDate(p['to']),
              format: 'money' as const,
            },
            {
              key: i + ':rate',
              label: 'Доля отмен',
              group: calendarDate(p['from']) + ' — ' + calendarDate(p['to']),
              format: 'percent' as const,
            },
          ]),
        ];
      case 'accruals':
        return [
          ...array(object(r['monthly_accruals'])['months']).map((m, i) => ({
            key: 'm:' + i,
            label: monthLabel(m),
            note: [
              m['partial'] ? calendarDate(m['from']) + '–' + calendarDate(m['to']) : '',
              m['coverage_confirmed'] !== true ? 'Полнота загрузки не подтверждена' : '',
              m['operation_count'] === 0 ? 'Нет операций в снимке' : '',
            ]
              .filter(Boolean)
              .join(' · '),
            format: 'money' as const,
          })),
          { key: 'total', label: 'Итого', format: 'money' },
        ];
      case 'operations':
        return [
          { key: 'operation_date', label: 'Дата', format: 'text' },
          { key: 'posting_number', label: 'Отправление', format: 'text' },
          { key: 'operation_type', label: 'Тип операции', format: 'text' },
          { key: 'amount', label: 'Сумма', format: 'money' },
        ];
      case 'market':
        return this.moneyColumns([
          'seller_price',
          'seller_promo_price',
          'marketplace_promo_price',
          'marketplace_card_price',
          'market_min_price',
          'min_competitor_price',
          'min_price',
        ]);
      default:
        return [
          { key: 'operation_count', label: 'Операций', format: 'number' },
          { key: 'amount', label: 'Сумма', format: 'money' },
          ...array(r['periods']).map((p, i) => ({
            key: 'w:' + i,
            label: calendarDate(p['from']),
            format: 'money' as const,
          })),
        ];
    }
  });
  readonly rows = computed<ReportRow[]>(() => {
    const report = this.data()?.report || {};
    const mode = this.view();
    const q = report['_filters_applied'] === true ? '' : this.query().q.toLocaleLowerCase();
    let rows: ReportRow[];
    const products = new Map(this.products().map((p) => [text(p['offer_id']), p]));
    const productPreview = (r: Entry): ProductPreviewData | undefined => {
      const offer = text(r['offer_id']);
      if (!offer || r['is_common']) return undefined;
      const meta = products.get(offer) || {};
      return {
        offer_id: offer,
        name: text(r['product_name'] || r['name'] || r['item_name'] || meta['name'] || offer),
        main_image: r['main_image'] || meta['main_image'],
      };
    };
    const normal = (r: Entry, id: string, label: string, offer?: string): ReportRow => ({
      id,
      label,
      offer: offer || undefined,
      preview: productPreview(r),
      cells: Object.fromEntries(Object.entries(r).map(([key, value]) => [key, amount(value)])),
      complete: r['is_complete'] !== false,
    });
    if (mode === 'gross') {
      const gross = (r: Entry, id: string, child = false): ReportRow => {
        const row = normal(
          r,
          id,
          text(r['category']),
          child && !r['is_common'] ? text(r['offer_id']) : undefined,
        );
        row.cells['product_name'] = child ? text(r['product_name']) : 'Итого по типу';
        if (r['is_complete'] === false) {
          row.cells['gross_profit'] = null;
          row.cells['gross_margin_pct'] = null;
          if (id !== 'total') row.cells['cost'] = null;
        }
        for (const m of array(r['months'])) {
          for (const key of ['ozon_accrual', 'cost', 'gross_profit', 'gross_margin_pct'])
            row.cells['month:' + m['key'] + ':' + key] =
              (['gross_profit', 'gross_margin_pct'].includes(key) ||
                (key === 'cost' && id !== 'total')) &&
              m['is_complete'] === false
                ? null
                : amount(m[key]);
        }
        if (!child)
          row.children = array(r['articles']).map((c, i) =>
            gross(
              { ...c, category: r['category'], product_type: r['product_type'] },
              id + ':' + i,
              true,
            ),
          );
        return row;
      };
      rows = array(report['rows']).map((r) =>
        gross(r, 'gross:' + r['category'] + ':' + r['product_type']),
      );
      if (Object.keys(object(report['totals'])).length)
        rows.push({
          ...gross(
            {
              ...object(report['totals']),
              category: 'Итого',
              product_type: '',
              product_name: 'Все товары отбора',
            },
            'total',
            true,
          ),
          isGroup: true,
          isTotal: true,
        });
    } else if (mode === 'weekly') {
      const weekly = (r: Entry, id: string, child = false): ReportRow => {
        const cells: ReportRow['cells'] = {};
        const cellNotes: Record<string, string> = {};
        array(r['weeks']).forEach((w, i) => {
          cells[i + ':orders'] = amount(w['orders_amount']);
          cells[i + ':dynamics'] = amount(w['dynamics_pct']);
          cells[i + ':cancelled'] = amount(w['cancelled_amount']);
          cells[i + ':rate'] = amount(w['cancellation_rate_pct']);
          if (w['orders_units'] != null)
            cellNotes[i + ':orders'] =
              w['orders_units'] +
              ' шт.' +
              (w['missing_price_rows'] ? ' · без цены: ' + w['missing_price_rows'] : '');
          if (w['cancelled_units'] != null)
            cellNotes[i + ':cancelled'] = w['cancelled_units'] + ' шт.';
        });
        return {
          id,
          label: text(r['category']),
          offer: child ? text(r['offer_id']) : undefined,
          preview: child ? productPreview(r) : undefined,
          cellNotes,
          cells: {
            ...cells,
            product_name: child
              ? text(r['product_name']) + ' · ' + text(r['offer_id'])
              : 'Итого по типу',
            product_type: text(r['product_type']),
          },
          children: child
            ? undefined
            : array(r['articles']).map((a, i) =>
                weekly(
                  { ...a, category: r['category'], product_type: r['product_type'] },
                  id + ':' + i,
                  true,
                ),
              ),
        };
      };
      const categories: Entry[] = array(report['categories']).length
        ? array(report['categories'])
        : array(report['category_rows']).map((r) => ({
            ...r,
            types: array(report['rows']).filter((t) => t['category'] === r['category']),
          }));
      rows = categories.length
        ? categories.map((r) => {
            const root = weekly({ ...r, articles: [] }, 'weekly:' + r['category']);
            root.cells['product_name'] = 'Итого по категории';
            root.children = array(r['types']).map((t) =>
              weekly(t, 'weekly:' + r['category'] + ':' + t['product_type']),
            );
            for (const type of root.children) type.label = 'Итого по типу';
            return root;
          })
        : array(report['rows']).map((r, i) =>
            weekly(r, 'weekly:' + r['category'] + ':' + r['product_type']),
          );
      const totalWeeks = Array.isArray(report['totals'])
        ? array(report['totals'])
        : array(object(report['totals'])['weeks']);
      if (totalWeeks.length)
        rows.push({
          ...weekly(
            {
              ...object(report['totals']),
              weeks: totalWeeks,
              category: 'Итого',
              product_type: '',
              product_name: 'Все товары отбора',
            },
            'total',
            true,
          ),
          isGroup: true,
          isTotal: true,
        });
    } else if (mode === 'accruals') {
      const matrix = object(report['monthly_accruals']);
      rows = [...array(matrix['rows']), object(matrix['total'])]
        .filter((r) => r['label'])
        .map((r, i) => {
          const row = normal(r, String(i), text(r['label']));
          (Array.isArray(r['values']) ? r['values'] : []).forEach(
            (v, n) => (row.cells['m:' + n] = amount(v)),
          );
          row.note = r['kind'] === 'group' ? 'Раздел' : r['kind'] === 'total' ? 'Итого' : undefined;
          row.isGroup = r['kind'] === 'group' || r['kind'] === 'total';
          row.isTotal = r['kind'] === 'total';
          return row;
        });
    } else if (mode === 'common') {
      rows = array(report['rows']).map((r, i) => {
        const row = normal(r, String(i), text(r['label']));
        (Array.isArray(r['weeks']) ? r['weeks'] : []).forEach(
          (v, n) => (row.cells['w:' + n] = amount(v)),
        );
        return row;
      });
      if (report['total'] !== undefined)
        rows.push({
          id: 'common-total',
          label: 'Итого общих начислений',
          isTotal: true,
          isGroup: true,
          cells: {
            amount: amount(report['total']),
            operation_count: amount(report['operation_count']),
            ...Object.fromEntries(
              ((report['week_totals'] as unknown[]) || []).map((v, i) => ['w:' + i, amount(v)]),
            ),
          },
        });
    } else {
      rows = array(report['items']).map((r, i) => {
        const row = normal(
          r,
          text(r['id'] || r['offer_id'] || i),
          text(r['name'] || r['item_name'] || r['offer_id'] || 'Общие операции Ozon'),
          (mode === 'profit' || mode === 'market') && !r['is_common']
            ? text(r['offer_id'])
            : undefined,
        );
        if (mode === 'operations') row.cells['operation_date'] = date(text(r['operation_date']));
        if (mode === 'market')
          row.note = array(r['competitors'])
            .map(
              (c) => text(c['name'] || c['competitor_sku']) + ': ' + currency(amount(c['price'])),
            )
            .join('; ');
        return row;
      });
    }
    if (q && !['operations', 'gross', 'common', 'accruals'].includes(mode))
      rows = rows
        .map((r) =>
          r.children &&
          ![r.label, r.offer, r.cells['product_name'], r.cells['product_type']]
            .join(' ')
            .toLocaleLowerCase()
            .includes(q)
            ? {
                ...r,
                children: r.children.filter((c) =>
                  [c.label, c.offer, c.cells['product_name'], c.cells['product_type']]
                    .join(' ')
                    .toLocaleLowerCase()
                    .includes(q),
                ),
              }
            : r,
        )
        .filter(
          (r) =>
            [r.label, r.offer, r.cells['product_name'], r.cells['product_type']]
              .join(' ')
              .toLocaleLowerCase()
              .includes(q) || !!r.children?.length,
        );
    return rows;
  });
  constructor() {
    combineLatest([this.route.queryParamMap, this.refresh])
      .pipe(
        map(([p]) => {
          this.view.set(
            this.tabs.some(([key]) => key === p.get('view')) ? p.get('view')! : 'profit',
          );
          this.start = p.get('start') || '';
          this.end = p.get('end') || '';
          if (!this.start && !this.end) this.setPeriod(this.view() === 'weekly' ? '42' : '30');
          else
            this.period = ['7', '30', '90', '28', '42', '56', '84'].includes(p.get('period') || '')
              ? p.get('period')!
              : 'custom';
          this.q = p.get('q') || '';
          this.operationType = p.get('operation_type') || '';
          this.category = p.get('category') || '';
          this.productType = p.get('product_type') || '';
          this.product = p.get('product') || '';
          this.article = p.get('article') || '';
          this.columnsFilter = p.get('column_filters') || '{}';
          this.facets = p.get('facets') || '{}';
          const query = {
            start: this.start,
            end: this.end,
            q: this.q,
            operation_type: this.operationType,
            page:
              Number.isSafeInteger(Number(p.get('page'))) && Number(p.get('page')) > 0
                ? Number(p.get('page'))
                : 1,
            page_size: [25, 50, 100, 200, 500].includes(Number(p.get('page_size')))
              ? Number(p.get('page_size'))
              : 50,
            category: this.category,
            product_type: this.productType,
            product: this.product,
            article: this.article,
            column_filters: this.columnsFilter,
            facets: this.facets,
          };
          this.query.set(query);
          return { view: this.view(), ...query };
        }),
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap((query) =>
          !validFinanceDates(query.start, query.end)
            ? (this.error.set('Укажите корректные даты периода.'), of(null))
            : this.http
                .get<FinanceData>(this.root + '/report', {
                  params: new HttpParams({ fromObject: query }),
                })
                .pipe(
                  catchError((e) => {
                    this.error.set(errorMessage(e));
                    return of(null);
                  }),
                ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((data) => {
        this.data.set(data);
        this.marketPage.set(1);
        this.tax = data?.tax_regime || 'usn_6';
        this.loading.set(false);
      });
  }
  setPageSize(size: number) {
    this.query.update((query) => ({ ...query, page_size: size }));
    this.navigate(this.view(), 1);
  }
  navigate(view = this.view(), page = 1) {
    if (!validFinanceDates(this.start, this.end)) {
      this.error.set('Укажите обе даты: начало периода не должно быть позже конца.');
      return;
    }
    this.error.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        view,
        facets: this.facets === '{}' ? null : this.facets,
        category: this.category || null,
        product_type: this.productType || null,
        product: this.product || null,
        article: this.article || null,
        column_filters: this.columnsFilter === '{}' ? null : this.columnsFilter,
        page_size: this.query().page_size,
        period: this.period,
        start: this.start || null,
        end: this.end || null,
        q: this.q || null,
        operation_type: this.operationType || null,
        page: page === 1 ? null : page,
      },
    });
  }
  reload() {
    this.refresh.next(this.refresh.value + 1);
  }
  openCost(offer: string) {
    this.error.set('');
    this.costEditor.set(offer);
    this.cost = '';
    this.costMonth = this.end.slice(0, 7) || this.costMonth;
    this.loadCosts();
  }
  loadCosts() {
    if (!this.costMonth) return;
    const key = this.costMonth + ':' + this.costEditor();
    this.costLoading.set(true);
    this.http
      .get<{ items: { offer_id: string; month: string; cost: string; source: string }[] }>(
        this.root + '/costs',
        { params: { month: this.costMonth + '-01' } },
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (key !== this.costMonth + ':' + this.costEditor()) return;
          this.costs.set(r.items);
          this.cost = r.items.find((x) => x.offer_id === this.costEditor())?.cost || '';
          this.costLoading.set(false);
        },
        error: (e) => {
          if (key === this.costMonth + ':' + this.costEditor()) {
            this.costLoading.set(false);
            this.error.set(errorMessage(e));
          }
        },
      });
  }
  saveCost() {
    if (this.costLoading()) return;
    this.post(
      '/cost/save',
      {
        offer_id: this.costEditor(),
        month: this.costMonth + '-01',
        cost_price: String(this.cost).replace(',', '.'),
      },
      () => {
        this.notice.set('Себестоимость за месяц сохранена в копии.');
        this.costEditor.set(null);
        this.reload();
      },
    );
  }
  saveTax() {
    this.post('/tax/save', { tax_regime: this.tax }, () => {
      this.notice.set('Налоговый режим сохранён в копии.');
      this.reload();
    });
  }
  export() {
    if (this.busy() || this.loading() || !this.data()) return;
    const kind = this.exportKind,
      view = this.view(),
      prefix = this.data()?.local_preview ? 'ozon-local-' : 'ozon-v2-';
    this.exporting.set(true);
    this.busy.set(true);
    this.http
      .post(this.root + '/export', { ...this.query(), view, kind }, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (b) => {
          this.exporting.set(false);
          download(b, prefix + (kind === 'view' ? view : kind) + '.xlsx');
          this.busy.set(false);
        },
        error: async (e) => {
          this.exporting.set(false);
          this.busy.set(false);
          this.error.set(await downloadErrorMessage(e));
        },
      });
  }
  private post(path: string, body: unknown, done: () => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post(this.root + path, body)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          done();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  private moneyColumns(keys: string[]): Column[] {
    const labels: Record<string, string> = {
      sales_revenue: 'Выручка',
      ozon_accrual: 'Итого маркетплейса',
      cost: 'Себестоимость',
      ozon_commission: 'Комиссия',
      acquiring: 'Эквайринг',
      logistics: 'Логистика',
      tax: 'Налог',
      profit: 'Прибыль',
      gross_profit: 'Валовая прибыль',
      net_profit: 'Чистая прибыль',
      seller_price: 'Цена продавца',
      seller_promo_price: 'Акция продавца',
      marketplace_promo_price: 'Акция Ozon',
      marketplace_card_price: 'Цена по карте покупателя',
      market_min_price: 'Минимум рынка',
      min_competitor_price: 'Конкуренты, мин.',
      min_price: 'Сохранённая минималка',
    };
    return keys.map((key) => ({ key, label: labels[key] || key, format: 'money' }));
  }

  periodOptions() {
    return [
      { value: '7', label: '7 дней' },
      { value: '30', label: '30 дней' },
      { value: '90', label: '90 дней' },
      ...(this.view() === 'weekly'
        ? [
            { value: '28', label: '4 недели' },
            { value: '42', label: '6 недель' },
            { value: '56', label: '8 недель' },
            { value: '84', label: '12 недель' },
          ]
        : []),
      { value: 'custom', label: 'Произвольный период' },
    ];
  }
  typeOptions() {
    return [
      { value: '', label: 'Все' },
      ...this.operationTypes().flatMap((type) => [{ value: String(type), label: String(type) }]),
    ];
  }
  categoryOptions() {
    return [
      { value: '', label: 'Все категории' },
      ...this.filterCategories().flatMap((value) => [
        { value: String(value), label: String(value) },
      ]),
    ];
  }
  productTypeOptions() {
    return [
      { value: '', label: 'Все типы' },
      ...this.filterTypes().flatMap((value) => [{ value: String(value), label: String(value) }]),
    ];
  }
  productOptions() {
    return [
      { value: '', label: 'Все товары' },
      ...this.filterProducts().flatMap((item) => [
        {
          value: String(item['offer_id']),
          label: String(item['name']) + ' · ' + String(item['offer_id']),
        },
      ]),
    ];
  }
  pageSizeOptions() {
    return FINANCE_PAGE_FILTER_OPTIONS_10;
  }
}
