import { ProductName } from '../shared/product-name';
import { ModalFocus } from '../shared/modal-focus';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, forkJoin, interval, Observable, of, Subject, Subscription } from 'rxjs';
import { StocksApi } from './api';
import {
  ExpectedPlan,
  ExpectedPreview,
  MatrixCell,
  MatrixPreview,
  RawStock,
  Rule,
  StockContext,
  StockFact,
  StockOperation,
  StockPage,
  StockRunPreview,
} from './contracts';
import { SessionContext } from '../core/session-context';
import { errorMessage } from '../core/api';
import { date } from '../core/format';
import { quantity } from '../workspace/format';
import { changedCell, shareToPercentage } from './matrix-state';
import { StockAllocation } from './stock-allocation';
import { normalizedRule } from './rule-input';
import { StockDrafts } from './stock-drafts';
import { AnimatedCount } from '../shared/animated-count';
import { expectedItems } from './expected-receipts';
import {
  stockFacetFields,
  emptyStockView,
  readStockView,
  stockRouteQuery,
  stockViewQuery,
  StockQuery,
  StockView,
} from './filter-state';
import { StockChoiceFilter, StockChoice } from './stock-choice';
import { StockPager } from './stock-pager';
import { StockRunPanel } from './stock-run-preview';
import { StockProductFilters, StockTextFilterChange } from './stock-product-filters';

@Component({
  selector: 'app-stocks-page',
  imports: [
    ProductName,
    FormsModule,
    RouterLink,
    ModalFocus,
    StockAllocation,
    StockProductFilters,
    AnimatedCount,
    StockChoiceFilter,
    StockPager,
    StockRunPanel,
  ],
  templateUrl: './stocks-page.html',
  styleUrls: ['./stocks-page.css', './stock-workflow.css'],
})
export class StocksPage {
  private readonly api = inject(StocksApi);
  private readonly session = inject(SessionContext);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly tabs = [
    ['reconciliation', 'Общий остаток'],
    ['matrix', 'Распределение по складам'],
    ['rules', 'Правила'],
    ['expected', 'Поставки'],
    ['warehouses', 'Склады'],
    ['history', 'История'],
  ] as const;
  readonly tab = signal('reconciliation');
  readonly pageTitle = computed(
    () => this.tabs.find((item) => item[0] === this.tab())?.[1] || 'Остатки и склады',
  );
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly facts = signal<StockPage<StockFact> | null>(null);
  readonly raw = signal<StockPage<RawStock> | null>(null);
  readonly rules = signal<StockPage<Rule> | null>(null);
  readonly context = signal<StockContext | null>(null);
  readonly operations = signal<StockOperation[]>([]);
  readonly plans = signal<ExpectedPlan[]>([]);
  private readonly drafts = inject(StockDrafts).forShop(this.session.session()!.tenant_id);
  readonly selection = this.drafts.selection;
  readonly matrix = this.drafts.matrix;
  readonly validation = this.drafts.validation;
  private readonly allocation = viewChild(StockAllocation);
  readonly matrixFilling = computed(() => this.allocation()?.filling() || false);
  readonly columns = this.drafts.columns;
  readonly warehouseDefaults = this.drafts.warehouseDefaults;
  readonly globalShare = this.drafts.globalShare;
  readonly detail = this.drafts.detail;
  readonly warehouseChoices = computed(() =>
    (this.context()?.stock_warehouses || [])
      .map((w) => ({
        value: w.source + '\t' + w.warehouse_id,
        label: (w.source === '1c' ? '1С · ' : 'Ozon · ') + (w.warehouse_name || w.warehouse_id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru', { numeric: true })),
  );
  readonly expectedQuantities = this.drafts.expected;
  readonly productNames = this.drafts.names;
  readonly expectedOffers = computed(() => [...this.selection()]);
  readonly expectedPage = signal(1);
  readonly expectedPageSize = signal(100);
  readonly planPage = signal(1);
  readonly planPageSize = signal(100);
  readonly visiblePlans = computed(() =>
    this.plans().slice(
      (this.planPage() - 1) * this.planPageSize(),
      this.planPage() * this.planPageSize(),
    ),
  );
  readonly expectedRowPage = computed(() =>
    Math.min(
      this.expectedPage(),
      Math.max(1, Math.ceil(this.expectedOffers().length / this.expectedPageSize())),
    ),
  );
  readonly expectedRows = computed(() =>
    this.expectedOffers().slice(
      (this.expectedRowPage() - 1) * this.expectedPageSize(),
      this.expectedRowPage() * this.expectedPageSize(),
    ),
  );
  readonly matrixValid = signal(
    !Object.keys(this.validation.errors()).some((key) => key.includes('\t')),
  );
  private readonly productFilters = viewChild(StockProductFilters);
  private request?: Subscription;
  private readonly textChanges = new Subject<void>();
  readonly preview = signal<MatrixPreview | null>(null);
  readonly runPlan = signal<StockRunPreview | null>(null);
  private readonly runPanel = viewChild('runPanel', { read: ElementRef<HTMLElement> });
  private readonly previewPanel = viewChild('previewPanel', { read: ElementRef<HTMLElement> });
  private readonly scrollToResult = effect((onCleanup) => {
    const panel = this.previewPanel() || this.runPanel();
    if (!panel) return;
    const frame = requestAnimationFrame(() =>
      panel.nativeElement.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      }),
    );
    onCleanup(() => cancelAnimationFrame(frame));
  });
  readonly expectedPreview = signal<ExpectedPreview | null>(null);
  readonly editor = signal<Rule | null>(null);
  private readonly ruleDialog = viewChild<ElementRef<HTMLDialogElement>>('ruleDialog');
  private readonly showRuleDialog = effect(() => {
    const dialog = this.ruleDialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  });
  readonly canWrite = computed(
    () =>
      !!this.session.session()?.is_owner ||
      ['manager', 'stock_operator'].includes(this.session.session()?.role || ''),
  );
  readonly currentPage = computed(() =>
    this.tab() === 'rules' ? this.rules() : this.tab() === 'warehouses' ? this.raw() : this.facts(),
  );
  readonly date = date;
  readonly quantity = quantity;
  readonly shareToPercentage = shareToPercentage;
  readonly labels: Record<string, string> = {
    matched: 'Совпадает',
    blocked_increase: 'Увеличение требует проверки',
    decrease_required: 'Требуется снижение',
    missing_1c: 'Нет данных 1С',
    missing_ozon: 'Нет снимка Ozon',
    zero_1c: 'Нулевой остаток 1С',
    zero_ozon: 'Нулевой остаток маркетплейса',
    active: 'Ожидается',
    arrived: 'Поступило',
    cancelled: 'Отменено',
    received: 'Поступило',
    expired: 'Срок ожидания истёк',
  };
  q = '';
  article = '';
  name = '';
  articleOperator = 'contains';
  nameOperator = 'contains';
  sort = 'offer_id';
  direction = 'asc';
  page = 1;
  pageSize = 100;
  arrival = this.drafts.arrival();
  expectedQty = 1;
  confirmFake = false;
  readonly facetFields = stockFacetFields;
  filters = emptyStockView().filters;
  readonly filterChoices = computed(
    () =>
      ({
        ...Object.fromEntries(
          Object.entries(this.facts()?.facets || {}).map(([key, values]) => [
            key,
            values.map((value) => ({ value, label: value })),
          ]),
        ),
        rules_status: [
          { value: 'with_rules', label: 'С правилами' },
          { value: 'without_rules', label: 'Без правил' },
        ],
        distribution_status: [
          { value: 'distributed', label: 'Распределено' },
          { value: 'undistributed', label: 'Не распределено' },
        ],
        mapping_status: [
          { value: 'verified', label: 'Подтверждена' },
          { value: 'unverified', label: 'Требует проверки' },
        ],
        status: [
          'matched',
          'blocked_increase',
          'decrease_required',
          'missing_1c',
          'missing_ozon',
          'zero_1c',
          'zero_ozon',
        ].map((value) => ({ value, label: this.labels[value] || value })),
        source: [
          { value: 'ozon', label: 'Маркетплейс' },
          { value: '1c', label: '1С' },
        ],
      }) as Record<string, StockChoice[]>,
  );
  constructor() {
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        const focused = document.activeElement;
        const editing =
          focused instanceof HTMLElement &&
          (focused.matches('input,select,textarea') || focused.isContentEditable);
        if (
          document.visibilityState === 'visible' &&
          !editing &&
          !this.productFilters()?.opened() &&
          !this.busy() &&
          !this.loading() &&
          !this.matrix().length &&
          !this.matrixFilling() &&
          this.matrixValid() &&
          !this.editor() &&
          !this.preview() &&
          !this.expectedPreview() &&
          this.tab() !== 'expected'
        )
          this.load();
      });
    this.textChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.applyFilters());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const tab = this.tabs.some(([key]) => key === params.get('tab'))
        ? params.get('tab')!
        : 'reconciliation';
      const state = readStockView(
        Object.fromEntries(params.keys.map((key) => [key, params.get(key)])),
        this.drafts.views.get(tab),
      );
      this.tab.set(tab);
      this.restoreView(state);
      this.drafts.views.set(tab, structuredClone(state));
      this.load();
    });
  }
  private view(): StockView {
    return {
      q: this.q,
      article: this.article,
      name: this.name,
      article_operator: this.articleOperator,
      name_operator: this.nameOperator,
      filters: structuredClone(this.filters),
      sort: this.sort,
      direction: this.direction,
      page: this.page,
      page_size: this.pageSize,
    };
  }
  private restoreView(state: StockView) {
    this.q = state.q;
    this.article = state.article;
    this.name = state.name;
    this.articleOperator = state.article_operator;
    this.nameOperator = state.name_operator;
    this.filters = state.filters;
    this.sort = state.sort;
    this.direction = state.direction;
    this.page = state.page;
    this.pageSize = state.page_size;
  }
  navigate(tab = this.tab(), page = 1) {
    const current = this.view();
    this.drafts.views.set(this.tab(), structuredClone(current));
    const next =
      tab === this.tab()
        ? { ...current, page }
        : structuredClone(this.drafts.views.get(tab) || emptyStockView());
    this.drafts.views.set(tab, structuredClone(next));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: stockRouteQuery(next, tab),
    });
  }
  private query(): StockQuery {
    return { ...stockViewQuery(this.view()), view: this.tab() === 'matrix' ? 'matrix' : '' };
  }
  setChoice(key: string, values: string[]) {
    this.filters = { ...this.filters, [key]: values };
    this.applyFilters();
  }
  setTextFilter(change: StockTextFilterChange) {
    this[change.field] = change.value;
    if (change.field === 'article' || change.field === 'name') this.scheduleTextFilter();
    else this.applyFilters();
  }
  resetFilters() {
    const state = emptyStockView();
    state.page_size = this.pageSize;
    this.restoreView(state);
    this.detail.update((value) => ({ ...value, page: 1, warehouse: '' }));
    this.navigate();
  }
  changePage(value: { page: number; size: number }) {
    this.pageSize = value.size;
    this.navigate(this.tab(), value.page);
  }
  sortBy(value: string) {
    this.direction = this.sort === value && this.direction === 'asc' ? 'desc' : 'asc';
    this.sort = value;
    this.navigate();
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    const tab = this.tab();
    this.request = forkJoin({
      context: this.api.context(),
      facts: this.api.facts(this.query()),
      rules: tab === 'rules' ? this.api.rules(this.query()) : of(null),
      raw:
        tab === 'warehouses' || tab === 'reconciliation' ? this.api.raw(this.rawQuery()) : of(null),
      plans: tab === 'expected' ? this.api.expected(this.q) : of({ items: [] }),
      history: tab === 'history' ? this.api.history() : of({ items: [] }),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.context.set(r.context);
          const saved = new Map(
            r.context.rules.map((rule) => [rule.offer_id + '\t' + rule.warehouse_id, rule]),
          );
          this.matrix.update((rows) =>
            rows.filter((row) =>
              changedCell(row, saved.get(row.offer_id + '\t' + row.warehouse_id) || null),
            ),
          );
          this.facts.set(r.facts);
          this.productNames.update((names) => ({
            ...names,
            ...Object.fromEntries(
              r.facts.items.map((row) => [row.offer_id, row.product_name || row.offer_id]),
            ),
          }));
          this.rules.set(r.rules);
          this.raw.set(r.raw);
          this.plans.set(r.plans.items);
          if (tab === 'expected') {
            const defaults = Object.fromEntries(
              r.plans.items
                .filter(
                  (plan) =>
                    plan.status === 'active' &&
                    this.selection().has(plan.offer_id) &&
                    !Object.hasOwn(this.expectedQuantities(), plan.offer_id),
                )
                .map((plan) => [plan.offer_id, plan.expected_qty]),
            );
            this.expectedQuantities.update((values) => ({ ...values, ...defaults }));
            const dates = r.plans.items
              .filter((plan) => plan.status === 'active' && this.selection().has(plan.offer_id))
              .map((plan) => plan.arrival_date);
            if (!this.arrival && dates.length && dates.every((date) => date === dates[0])) {
              this.arrival = dates[0];
              this.drafts.arrival.set(this.arrival);
            }
          }
          this.operations.set(r.history.items);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }
  private rawQuery(): StockQuery {
    const query = this.query();
    if (this.tab() === 'reconciliation') {
      query['page'] = this.detail().page;
      query['page_size'] = this.detail().size;
    }
    const wh = this.detail().warehouse;
    if (wh) {
      const [source, id] = wh.split('\t');
      query['source'] = [source];
      query['warehouse_id'] = id;
    }
    return query;
  }
  changeDetail(page: number, size = this.detail().size) {
    this.detail.update((value) => ({ ...value, page, size }));
    this.run(this.api.raw(this.rawQuery()), (result) => this.raw.set(result));
  }
  detailWarehouse(value: string) {
    this.detail.update((previous) => ({ ...previous, warehouse: value, page: 1 }));
    if (this.tab() === 'warehouses') this.navigate(this.tab(), 1);
    else this.changeDetail(1);
  }
  applyFilters() {
    this.detail.update((value) => ({ ...value, page: 1 }));
    this.navigate();
  }
  scheduleTextFilter() {
    this.textChanges.next();
  }
  setArrival(value: string) {
    this.arrival = value;
    this.drafts.arrival.set(value);
    this.expectedPreview.set(null);
  }
  updateMatrix(rows: MatrixCell[]) {
    this.matrix.set(rows);
    this.preview.set(null);
    this.runPlan.set(null);
    this.confirmFake = false;
  }
  setMatrixValidity(valid: boolean) {
    this.matrixValid.set(valid);
    if (!valid) {
      if (this.preview())
        this.notice.set('Расчёт отменён: исправьте ошибочный ввод и рассчитайте изменения заново.');
      this.preview.set(null);
      this.runPlan.set(null);
      this.confirmFake = false;
    }
  }
  warehouseName(id: string | null) {
    return (
      this.context()?.ozon_warehouses.find((w) => w.warehouse_id === id)?.warehouse_name ||
      id ||
      'Все склады'
    );
  }
  toggle(offer: string, checked: boolean) {
    this.expectedPreview.set(null);
    this.runPlan.set(null);
    this.selection.update((s) => {
      const next = new Set(s);
      checked ? next.add(offer) : next.delete(offer);
      return next;
    });
  }
  clearSelection() {
    this.expectedPreview.set(null);
    this.selection.set(new Set());
    this.runPlan.set(null);
    this.notice.set('');
  }
  selectAll() {
    this.expectedPreview.set(null);
    this.runPlan.set(null);
    this.run(this.api.selection(this.query()), (r) => {
      this.selection.update((previous) => new Set([...previous, ...r.offer_ids]));
      if (r.names) this.productNames.update((names) => ({ ...names, ...r.names }));
      this.notice.set('Выбрано товаров: ' + r.offer_ids.length);
    });
  }
  toMatrix() {
    this.preview.set(null);
    this.navigate('matrix');
  }
  setSelection(value: Set<string>) {
    this.selection.set(value);
    this.expectedPreview.set(null);
    this.runPlan.set(null);
  }
  checkSavedRules() {
    if (
      !this.selection().size ||
      this.matrix().length ||
      !this.matrixValid() ||
      this.matrixFilling() ||
      !this.canWrite()
    )
      return;
    this.runPlan.set(null);
    const selected = [...this.selection()];
    this.run(this.api.runPreview(selected), (result) => {
      if (
        JSON.stringify([...this.selection()]) === JSON.stringify(selected) &&
        !this.matrix().length &&
        this.matrixValid()
      )
        this.runPlan.set(result);
    });
  }
  checkMatrix() {
    if (!this.matrixValid() || !this.matrix().length || this.matrixFilling() || !this.canWrite())
      return;
    const snapshot = JSON.stringify(this.matrix());
    this.run(this.api.preview(this.matrix()), (r) => {
      if (JSON.stringify(this.matrix()) !== snapshot || !this.matrixValid() || !this.canWrite())
        return;
      this.preview.set(r);
      this.confirmFake = false;
    });
  }
  applyMatrix() {
    const preview = this.preview();
    const submitted = new Map(
      this.matrix().map((row) => [row.offer_id + '\t' + row.warehouse_id, JSON.stringify(row)]),
    );
    if (
      preview &&
      this.matrixValid() &&
      !this.matrixFilling() &&
      !this.loading() &&
      this.canWrite() &&
      (!preview.requires_fake_confirmation || this.confirmFake)
    )
      this.run(this.api.action('apply', preview.operation_id, this.confirmFake), (r) => {
        this.notice.set('Сохранено правил: ' + r.applied + '. Отправка выключена.');
        this.preview.set(null);
        this.matrix.update((rows) =>
          rows.filter(
            (row) => submitted.get(row.offer_id + '\t' + row.warehouse_id) !== JSON.stringify(row),
          ),
        );
        this.load();
      });
  }
  undo(op: StockOperation) {
    this.run(this.api.action('undo', op.operation_id), (r) => {
      this.notice.set(
        'Отменено: ' + r.undone + '. Более поздних изменений пропущено: ' + r.conflicts,
      );
      this.load();
    });
  }
  edit(rule: Rule) {
    this.error.set('');
    this.editor.set({
      id: rule.id,
      offer_id: rule.offer_id,
      warehouse_id: rule.warehouse_id,
      target_qty: rule.target_qty,
      maintain_target: rule.maintain_target,
      share: rule.share,
      quantum: rule.quantum,
      enabled: rule.enabled,
      version: rule.version,
    });
  }
  newRule() {
    this.error.set('');
    this.editor.set({
      offer_id: [...this.selection()][0] || '',
      warehouse_id: this.context()?.ozon_warehouses[0]?.warehouse_id || null,
      target_qty: null,
      maintain_target: false,
      share: 1,
      quantum: 1,
      enabled: true,
    });
  }
  saveRule() {
    const rule = this.editor();
    if (!rule || !this.canWrite()) return;
    try {
      this.run(this.api.save(normalizedRule(rule)), () => {
        this.editor.set(null);
        this.notice.set('Правило сохранено в копии.');
        this.load();
      });
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
  refreshWarehouses() {
    if (this.session.databaseCopy()) {
      this.notice.set('Склады прочитаны из копии базы. Запросов в Ozon не было.');
      this.load();
      return;
    }
    this.run(this.api.refresh(), () => {
      this.notice.set(
        this.context()?.local_preview
          ? 'Список тестовых складов обновлён. Внешних запросов не было.'
          : 'Список складов прочитан из Ozon.',
      );
      this.load();
    });
  }
  checkExpected() {
    if (!this.canWrite()) return;
    if (!this.selection().size) {
      this.error.set('Выберите товары в сверке.');
      return;
    }
    try {
      const items = expectedItems(
        this.selection(),
        this.expectedQuantities(),
        this.expectedQty,
        this.context()?.expected_physical_by_offer,
      );
      if (!items.length) {
        this.error.set(
          'У выбранных товаров уже есть физический остаток 1С. Выберите ожидаемые товары.',
        );
        return;
      }
      const snapshot = JSON.stringify({ arrival: this.arrival, items });
      this.run(this.api.expectedPreview(this.arrival, items), (r) => {
        try {
          const current = expectedItems(
            this.selection(),
            this.expectedQuantities(),
            this.expectedQty,
            this.context()?.expected_physical_by_offer,
          );
          if (JSON.stringify({ arrival: this.arrival, items: current }) === snapshot)
            this.expectedPreview.set(r);
        } catch {
          /* Invalid changed inputs must never revive an earlier preview. */
        }
      });
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
  setExpectedQty(offer: string, value: number | null) {
    this.expectedQuantities.update((rows) => ({ ...rows, [offer]: value }));
    this.expectedPreview.set(null);
  }
  fillExpectedQty() {
    this.expectedQuantities.update((rows) => ({
      ...rows,
      ...Object.fromEntries([...this.selection()].map((offer) => [offer, this.expectedQty])),
    }));
    this.expectedPreview.set(null);
  }
  applyExpected() {
    const p = this.expectedPreview();
    if (p && this.canWrite())
      this.run(this.api.expectedApply(p.operation_id), () => {
        this.expectedPreview.set(null);
        this.notice.set('План поставки сохранён в копии.');
        this.load();
      });
  }
  private run<T>(request: Observable<T>, success: (result: T) => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (r) => {
        this.busy.set(false);
        success(r);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
