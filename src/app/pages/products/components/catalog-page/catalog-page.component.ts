import {
  CATALOG_PAGE_FILTER_OPTIONS_5,
  CATALOG_PAGE_FILTER_OPTIONS_6,
  CATALOG_PAGE_FILTER_OPTIONS_9,
  CATALOG_PAGE_FILTER_OPTIONS_10,
  CATALOG_PAGE_FILTER_OPTIONS_11,
} from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  CATALOG_PAGE_COMPONENT_TABLE_COLUMNS1,
  CATALOG_PAGE_COMPONENT_RULE_FIELDS,
  CATALOG_PAGE_COMPONENT_OPERATORS,
  facetFields,
} from './infrastructure/constants/catalog-page.constants';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, debounceTime, catchError, of, switchMap, tap } from 'rxjs';
import { CatalogApi } from '../../infrastructure/services/catalog-api.service';
import { mappingReasons } from '../../../mapping/infrastructure/constants/mapping-logic.constants';
import type { ActionKind, CatalogMode } from '../../infrastructure/types/contracts.types';
import type {
  CatalogOperation,
  CatalogPage,
  CatalogQuery,
  CatalogRow,
  SavedView,
} from '../../infrastructure/interfaces/contracts.interfaces';
import { defaultQuery } from '../../infrastructure/utils/contracts.utils';
import { mappingLabels } from '../../infrastructure/constants/contracts.constants';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { money, date, source } from '../../../../core/infrastructure/utils/format.utils';
import { StockDrafts } from '../../../stocks/infrastructure/services/stock-drafts.service';
import { ColumnChange, ColumnRules } from '../../../../shared/directives/filter-panel/filter-panel';
import { CatalogSelections } from '../../infrastructure/services/catalog-selections.service';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-catalog-page',

  templateUrl: './catalog-page.component.html',
  styleUrl: '../../infrastructure/styles/catalog.css',
})
export class CatalogPageComponent {
  tableColumns1(): DataTableColumn[] {
    return CATALOG_PAGE_COMPONENT_TABLE_COLUMNS1;
  }

  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly context = inject(SessionContext);
  readonly databaseCopy = this.context.databaseCopy;
  private readonly destroy = inject(DestroyRef);
  readonly mode = this.route.snapshot.data['mode'] as CatalogMode;
  get pageTitle(): string {
    return this.mode === 'products' ? 'Карточки товаров' : 'Связь товаров с 1С';
  }
  readonly productFiltersOpen = signal(false);
  applyProductFilters() {
    this.clearRules();
    this.applyFilters();
    this.productFiltersOpen.set(false);
  }
  resetProductFilters() {
    this.reset();
    this.productFiltersOpen.set(false);
  }
  readonly productDetails = signal<CatalogRow | null>(null);
  readonly campaignOffers = signal<string[] | null>(null);
  readonly filteredIds = signal<string[] | null>(null);
  readonly allFilteredSelected = computed(
    () =>
      !!this.filteredIds()?.length && this.filteredIds()!.every((id) => this.selected().has(id)),
  );
  readonly columnRules = computed<ColumnRules>(() => {
    try {
      return JSON.parse(this.query().column_filters || '{}');
    } catch {
      return {};
    }
  });
  private readonly refreshRequest = new BehaviorSubject(0);
  private loadedRefresh = 0;
  private filterSignature = '';
  private paramSignature = '';
  private readonly stockDrafts = inject(StockDrafts);
  readonly data = signal<CatalogPage | null>(null);
  readonly query = signal(defaultQuery(this.mode));
  readonly loading = signal(true);
  readonly moreLoading = signal(false);
  readonly moreFailed = signal(false);
  private listVersion = 0;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly selected = inject(CatalogSelections).scope(this.context.session()!.tenant_id, this.mode);
  readonly action = signal<{
    kind: ActionKind;
    offers: string[];
    row?: CatalogRow;
    field?: string;
  } | null>(null);
  readonly history = signal<CatalogOperation[]>([]);
  readonly historyError = signal('');
  readonly undoId = signal('');
  readonly attributeBulk = signal(false);
  readonly attributeHistoryOnly = signal(false);
  readonly views = signal<SavedView[]>([]);
  readonly viewName = new FormControl('', { nonNullable: true });
  readonly viewId = new FormControl('', { nonNullable: true });
  readonly rules = new FormArray<
    FormGroup<{
      field: FormControl<string>;
      operator: FormControl<string>;
      value: FormControl<string>;
    }>
  >([]);
  readonly ruleLogic = new FormControl('and', { nonNullable: true });
  private inheritedRules = '';
  readonly ruleFields = CATALOG_PAGE_COMPONENT_RULE_FIELDS;
  readonly operators = CATALOG_PAGE_COMPONENT_OPERATORS;
  readonly labels = mappingLabels;
  readonly reasons = mappingReasons;
  readonly reasonKeys = Object.keys(mappingReasons).filter((k) => k !== 'confirmed');
  readonly statusKeys = Object.keys(mappingLabels);
  readonly fields = facetFields;
  readonly money = money;
  readonly date = date;
  readonly source = source;
  readonly canManage = computed(() => {
    const s = this.context.session();
    return !!s && (s.is_owner || s.role === 'manager');
  });
  readonly hiddenSelected = computed(
    () =>
      this.selected().size -
      (this.data()?.items.filter((r) => this.selected().has(r.offer_id)).length || 0),
  );
  readonly allOnPage = computed(
    () =>
      !!this.data()?.items.length &&
      this.data()!.items.every((r) => this.selected().has(r.offer_id)),
  );
  readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.data()?.meta.total || 0) / this.query().page_size)),
  );
  readonly form = new FormGroup<Record<string, FormControl<string>>>(
    Object.fromEntries(
      [
        ...facetFields.map((f) => f.key),
        'q',
        'name_search',
        'mapping_reason',
        'articles',
        'mapping_status',
        'cost_mode',
        'days',
        'sort',
        'direction',
        'page_size',
      ].map((key) => [key, new FormControl('', { nonNullable: true })]),
    ),
  );
  readonly excludeArticles = new FormControl(false, { nonNullable: true });

  constructor() {
    combineLatest([this.route.queryParamMap, this.refreshRequest])
      .pipe(
        tap(([params]) => {
          this.listVersion++;
          this.moreLoading.set(false);
          this.moreFailed.set(false);
          const next = defaultQuery(this.mode);
          for (const key of Object.keys(next) as (keyof CatalogQuery)[]) {
            if (key === 'mode' || !params.has(key)) continue;
            const value = params.get(key)!;
            if (typeof next[key] === 'number')
              Object.assign(next, {
                [key]:
                  Number.isSafeInteger(Number(value)) && Number(value) > 0
                    ? Number(value)
                    : Number(next[key]),
              });
            else if (key === 'exclude_articles') next.exclude_articles = value === 'true';
            else Object.assign(next, { [key]: value });
          }
          next.page_size = [25, 50, 100, 200, 500].includes(next.page_size) ? next.page_size : 50;
          next.days = Math.min(365, next.days);
          const scope = this.scopeKey(next);
          if (scope !== this.filterSignature) {
            this.filteredIds.set(null);
            this.filterSignature = scope;
          }
          this.query.set(next);
          const signature = JSON.stringify(
            Object.fromEntries(params.keys.map((k) => [k, params.get(k)])),
          );
          if (signature !== this.paramSignature || this.paramSignature === '') {
            this.paramSignature = signature;
            this.loadRules(next.rules);
            for (const [key, control] of Object.entries(this.form.controls))
              control.setValue(String(next[key as keyof CatalogQuery]), { emitEvent: false });
            this.excludeArticles.setValue(next.exclude_articles, { emitEvent: false });
          }
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(([, refresh]) => {
          const fresh = refresh !== this.loadedRefresh;
          this.loadedRefresh = refresh;
          return this.api.list(this.query(), fresh).pipe(
            catchError((error) => {
              this.error.set(errorMessage(error));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((data) => {
        this.data.set(data);
        this.loading.set(false);
      });
    this.form.controls['q'].valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (!this.productFiltersOpen()) this.applyFilters();
      });
    this.loadHistory();
    this.loadViews();
  }

  private scopeKey(query: CatalogQuery) {
    return JSON.stringify({ ...query, page: 1, page_size: 50, sort: '', direction: '' });
  }
  loadMoreMappings() {
    const current = this.data();
    if (this.mode !== 'mapping' || this.loading() || this.moreLoading() || !current?.meta.has_more)
      return;
    const version = this.listVersion;
    this.moreLoading.set(true);
    this.moreFailed.set(false);
    this.api
      .list({ ...this.query(), page: current.meta.page + 1 })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (next) => {
          if (version !== this.listVersion) return;
          const seen = new Set(current.items.map((r) => r.offer_id));
          this.data.set({
            ...next,
            items: [...current.items, ...next.items.filter((r) => !seen.has(r.offer_id))],
          });
          this.moreLoading.set(false);
        },
        error: (e) => {
          if (version !== this.listVersion) return;
          this.moreLoading.set(false);
          this.moreFailed.set(true);
          this.error.set(errorMessage(e));
        },
      });
  }
  setMappingGroup(value: string) {
    this.form.controls['mapping_status'].setValue(value);
    if (value === 'matched' || value === 'verified')
      this.form.controls['mapping_reason'].setValue('');
    this.applyFilters();
  }
  facetValues(value: string): string[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value ? [value] : [];
    }
  }
  facetOptions(key: string) {
    return (this.data()?.facets[key] || []).map((o) => ({
      value: o.value,
      label: o.value + ' · ' + o.count,
    }));
  }
  setFacet(key: string, values: string[]) {
    this.form.controls[key].setValue(values.length ? JSON.stringify(values) : '');
  }
  columnChanged(change: ColumnChange) {
    const columns = { ...this.columnRules() };
    if (change.rule) columns[change.field] = change.rule;
    else delete columns[change.field];
    this.query.update((q) => ({ ...q, column_filters: JSON.stringify(columns) }));
    this.applyFilters();
  }
  sortColumn(key: string) {
    this.form.controls['direction'].setValue(
      this.form.controls['sort'].value === key && this.form.controls['direction'].value === 'asc'
        ? 'desc'
        : 'asc',
    );
    this.form.controls['sort'].setValue(key);
    this.applyFilters();
  }
  activeQuery(): CatalogQuery {
    return {
      ...this.query(),
      ...this.form.getRawValue(),
      days: Number(this.form.controls['days'].value) || 30,
      page_size: Number(this.form.controls['page_size'].value) || 50,
      exclude_articles: this.excludeArticles.value,
      rules: this.encodeRules(),
    } as CatalogQuery;
  }
  toggleFiltered(checked: boolean) {
    if (checked) {
      this.selectAll();
      return;
    }
    this.api
      .selection(this.activeQuery())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.filteredIds.set(r.offer_ids);
          this.selected.update(
            (previous) => new Set([...previous].filter((id) => !r.offer_ids.includes(id))),
          );
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  openStocks() {
    if (!this.selected().size) return;
    this.stockDrafts
      .forShop(this.context.session()!.tenant_id)
      .selection.set(new Set(this.selected()));
    void this.router.navigate(['/stocks'], { queryParams: { tab: 'matrix', page: 1 } });
  }
  applyFilters(page = 1): void {
    let rules = '';
    try {
      rules = this.encodeRules();
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    const current = {
      ...this.query(),
      ...this.form.getRawValue(),
      exclude_articles: this.excludeArticles.value,
      page,
      rules,
    };
    const defaults = defaultQuery(this.mode);
    const queryParams = Object.fromEntries(
      Object.entries(current).filter(
        ([key, value]) =>
          key !== 'mode' &&
          String(value) !== String(defaults[key as keyof CatalogQuery]) &&
          value !== '',
      ),
    );
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }
  addRule(): void {
    this.inheritedRules = '';
    this.rules.push(
      new FormGroup({
        field: new FormControl('name', { nonNullable: true }),
        operator: new FormControl('contains', { nonNullable: true }),
        value: new FormControl('', { nonNullable: true }),
      }),
    );
  }
  clearRules(): void {
    this.inheritedRules = '';
    this.rules.clear();
  }
  private loadRules(value: string): void {
    this.rules.clear();
    this.inheritedRules = '';
    if (!value) return;
    try {
      const parsed = JSON.parse(value) as {
        logic: string;
        conditions: { field?: string; operator: string; value: unknown }[];
      };
      if (parsed.conditions.some((c) => !c.field)) {
        this.inheritedRules = value;
        return;
      }
      this.ruleLogic.setValue(parsed.logic);
      for (const c of parsed.conditions)
        this.rules.push(
          new FormGroup({
            field: new FormControl(c.field!, { nonNullable: true }),
            operator: new FormControl(c.operator, { nonNullable: true }),
            value: new FormControl(
              Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? ''),
              { nonNullable: true },
            ),
          }),
        );
    } catch {
      this.inheritedRules = value;
    }
  }
  private encodeRules(): string {
    if (this.inheritedRules) return this.inheritedRules;
    if (!this.rules.length) return '';
    const conditions = this.rules.getRawValue().map((c) => {
      if (['is_empty', 'is_not_empty'].includes(c.operator)) return { ...c, value: null };
      if (!c.value.trim())
        throw new Error('Укажите значения всех условий фильтра или удалите пустое условие.');
      const numeric = [
        'units_per_item',
        'price',
        'cost_price',
        'fixed_margin',
        'available',
        'revenue',
        'package_cost',
        'unit_cost',
      ].includes(c.field);
      if (['gt', 'gte', 'lt', 'lte'].includes(c.operator) && !numeric)
        throw new Error('Сравнение больше/меньше доступно только для числовых полей.');
      if (numeric && ['contains', 'not_contains', 'starts_with'].includes(c.operator))
        throw new Error('Для числового поля выберите сравнение чисел.');
      if (numeric) {
        const values = ['in', 'not_in'].includes(c.operator) ? c.value.split(/[,;\n]+/) : [c.value];
        if (
          values.some(
            (v) =>
              !v.trim() ||
              !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim().replace(',', '.')) ||
              !Number.isFinite(Number(v.trim().replace(',', '.'))),
          )
        )
          throw new Error('Укажите число в условии фильтра.');
      }
      return {
        ...c,
        value: ['in', 'not_in'].includes(c.operator)
          ? c.value
              .split(/[,;\n]+/)
              .map((v) => v.trim())
              .filter(Boolean)
          : c.value.trim(),
      };
    });
    return JSON.stringify({ logic: this.ruleLogic.value, conditions });
  }
  loadViews(): void {
    this.api
      .views()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => this.views.set(result.items),
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
  saveView(): void {
    if (!this.viewName.value.trim()) {
      this.error.set('Укажите название отбора.');
      return;
    }
    let query: CatalogQuery;
    try {
      query = this.activeQuery();
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    this.busy.set(true);
    this.api
      .saveView(this.viewName.value.trim(), query)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.viewName.setValue('');
          this.viewId.setValue(result.view_id);
          this.loadViews();
          this.notice.set('Отбор сохранён в v2.');
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  openView(): void {
    const view = this.views().find((v) => v.view_id === this.viewId.value);
    if (!view) return;
    const { mode, ...queryParams } = view.query;
    void this.router.navigate([mode === 'mapping' ? '/mapping' : '/products'], { queryParams });
  }
  deleteView(): void {
    this.busy.set(true);
    this.api
      .deleteView(this.viewId.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.viewId.setValue('');
          this.loadViews();
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(errorMessage(error));
        },
      });
  }
  reset(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  refresh(): void {
    this.refreshRequest.next(this.refreshRequest.value + 1);
  }
  toggle(offer: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      next.has(offer) ? next.delete(offer) : next.add(offer);
      return next;
    });
  }
  newSet(): Set<string> {
    return new Set<string>();
  }
  selectedOffers(): string[] {
    return [...this.selected()];
  }
  openCard(row: CatalogRow): void {
    void this.router.navigate(['/products/card'], { queryParams: { offer_id: row.offer_id } });
  }
  togglePage(): void {
    const remove = this.allOnPage();
    this.selected.update((current) => {
      const next = new Set(current);
      for (const row of this.data()?.items || [])
        remove ? next.delete(row.offer_id) : next.add(row.offer_id);
      return next;
    });
  }
  selectAll(): void {
    if (this.busy()) return;
    let query: CatalogQuery;
    try {
      query = this.activeQuery();
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    const signature = this.scopeKey(query);
    this.busy.set(true);
    this.error.set('');
    this.api
      .selection(query)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (signature === this.filterSignature) this.filteredIds.set(result.offer_ids);
          this.selected.update((previous) => new Set([...previous, ...result.offer_ids]));
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  edit(kind: ActionKind, row?: CatalogRow, field = ''): void {
    this.action.set({ kind, offers: row ? [row.offer_id] : [...this.selected()], row, field });
  }
  changed(): void {
    this.action.set(null);
    this.refresh();
    this.loadHistory();
    this.notice.set('Изменения сохранены локально. Отправок не было.');
  }
  loadHistory(): void {
    this.historyError.set('');
    this.api
      .operations()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => this.history.set(result.items),
        error: (error) => this.historyError.set(errorMessage(error)),
      });
  }
  undo(op: CatalogOperation): void {
    if (this.undoId()) return;
    this.undoId.set(op.operation_id);
    this.historyError.set('');
    this.api
      .undo(op.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => this.undoFinished(result),
        error: (error) => {
          // A lost response may still mean that the transaction committed.
          this.api
            .operation(op.operation_id)
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe({
              next: (result) => {
                if (result.status === 'undone') this.undoFinished(result);
                else {
                  this.undoId.set('');
                  this.historyError.set(errorMessage(error));
                }
              },
              error: () => {
                this.undoId.set('');
                this.historyError.set(
                  'Ответ потерян. Обновите историю и проверьте статус операции перед повтором.',
                );
              },
            });
        },
      });
  }
  private undoFinished(result: CatalogOperation): void {
    this.undoId.set('');
    this.notice.set(
      `Отменено: ${result.undone}. Пропущено из-за последующих изменений: ${result.conflicts}.`,
    );
    this.refresh();
    this.loadHistory();
  }
  export(): void {
    if (this.busy()) return;
    let query: CatalogQuery;
    try {
      query = this.activeQuery();
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .export(query)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          const columns = [
            'offer_id',
            'name',
            'sku',
            'onec_code',
            'sku_1c',
            'onec_name',
            'mapping_status',
            'units_per_item',
            'unit_cost',
            'package_cost',
            'price',
            'units_sold',
            'revenue',
            'available',
          ] as const;
          const cell = (value: unknown) => {
            let text = String(value ?? '');
            if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          };
          const csv =
            '\uFEFF' +
            [
              columns.join(';'),
              ...result.items.map((row) => columns.map((key) => cell(row[key])).join(';')),
            ].join('\r\n');
          const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = this.mode + '-v2.csv';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }

  mappingStatusOptions() {
    return [
      { value: '', label: 'Все состояния' },
      ...this.statusKeys.flatMap((key) => [
        { value: String(key), label: String(this.labels[key]) },
      ]),
    ];
  }
  mappingReasonOptions() {
    return [
      { value: '', label: 'Все причины' },
      ...this.reasonKeys.flatMap((key) => [
        { value: String(key), label: String(this.reasons[key]) },
      ]),
    ];
  }
  daysOptions() {
    return CATALOG_PAGE_FILTER_OPTIONS_5;
  }
  costModeOptions() {
    return CATALOG_PAGE_FILTER_OPTIONS_6;
  }
  sortOptions() {
    return CATALOG_PAGE_FILTER_OPTIONS_9;
  }
  directionOptions() {
    return CATALOG_PAGE_FILTER_OPTIONS_10;
  }
  pageSizeOptions() {
    return CATALOG_PAGE_FILTER_OPTIONS_11;
  }
}
