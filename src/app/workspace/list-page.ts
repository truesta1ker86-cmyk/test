import { ProductName } from '../shared/product-name';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { WorkspaceApi } from './api';
import { SessionContext } from '../core/session-context';
import { ListPage, ListQuery, Order, ReturnRow } from './contracts';
import { OrderDetails } from './order-detail';
import { date } from '../core/format';
import { errorMessage, downloadErrorMessage } from '../core/api';
import { currency, quantity, status, download } from './format';
import { Icon } from '../shared/icon';
import {
  FinanceColumnFilter,
  FinanceColumnChange,
  FinanceColumnRules,
} from '../finance/finance-column-filter';
import {
  canLabel,
  completedStatuses,
  orderStatuses,
  orderActionLabel,
  sortOperational,
} from './operational-logic';

@Component({
  selector: 'app-operational-list',
  imports: [RouterLink, ReactiveFormsModule, OrderDetails, ProductName, Icon, FinanceColumnFilter],
  templateUrl: './list-page.html',
  styleUrl: './list-page.css',
})
export class OperationalList {
  readonly databaseCopy = inject(SessionContext).databaseCopy;
  private readonly api = inject(WorkspaceApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly reload = new BehaviorSubject(0);
  readonly entity = this.route.snapshot.data['entity'] as 'orders' | 'returns';
  readonly data = signal<ListPage | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly labelsBusy = signal(false);
  readonly selected = signal(new Set<string>());
  readonly notice = signal('');
  readonly error = signal('');
  readonly detail = signal<string | null>(null);
  readonly headingSort = signal({ field: '', desc: false });
  readonly rows = computed(() =>
    sortOperational(
      this.data()?.items || [],
      this.entity,
      this.headingSort().field,
      this.headingSort().desc,
    ),
  );
  sortHeading(field: string) {
    this.headingSort.update((s) => ({ field, desc: s.field === field ? !s.desc : false }));
  }
  readonly query = signal<ListQuery>({
    q: '',
    status: '',
    scheme: '',
    lifecycle: this.entity === 'orders' ? 'current' : '',
    start: '',
    end: '',
    page: 1,
    page_size: 50,
    sort: 'date_desc',
    column_filters: '',
  });
  readonly form = new FormGroup(
    Object.fromEntries(
      [
        'q',
        'status',
        'scheme',
        'lifecycle',
        'start',
        'end',
        'page_size',
        'sort',
        'column_filters',
      ].map((k) => [k, new FormControl('', { nonNullable: true })]),
    ),
  );
  readonly columnRules = computed<FinanceColumnRules>(() => {
    try {
      const v = JSON.parse(this.query().column_filters || '{}');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  });
  readonly scopeTotal = computed(() =>
    this.entity === 'orders'
      ? this.data()?.summary?.[this.query().lifecycle === 'completed' ? 'completed' : 'current']
      : this.data()?.summary?.total,
  );
  readonly columns = computed(() =>
    this.entity === 'orders'
      ? [
          { key: 'posting_number', label: 'Номер' },
          { key: 'scheme', label: 'Схема' },
          { key: 'status', label: 'Статус' },
          { key: 'date', label: 'Дата заказа' },
          { key: 'items', label: 'Состав' },
          { key: 'amount', label: 'Сумма', numeric: true },
        ]
      : [
          { key: 'posting_number', label: 'Заказ' },
          { key: 'offer_id', label: 'Артикул' },
          { key: 'amount', label: 'Сумма', numeric: true },
          { key: 'date', label: 'Дата' },
          { key: 'status', label: 'Статус' },
        ],
  );
  readonly statuses = computed(() =>
    [
      ...new Set([
        ...orderStatuses,
        ...(this.data()?.statuses || []).map((s) =>
          s === 'awaiting_deliver' ? 'awaiting_delivering' : s,
        ),
      ]),
    ].filter((s) => completedStatuses.has(s) === (this.query().lifecycle === 'completed')),
  );
  readonly readyRows = computed(() =>
    (this.data()?.items || []).map((r) => r as Order).filter(canLabel),
  );
  readonly hiddenSelected = computed(
    () =>
      [...this.selected()].filter((id) => !this.readyRows().some((r) => r.posting_number === id))
        .length,
  );
  readonly date = date;
  readonly currency = currency;
  readonly quantity = quantity;
  readonly status = status;
  readonly canLabel = canLabel;
  readonly actionLabel = orderActionLabel;
  constructor() {
    const queries = this.route.queryParamMap.pipe(
      map((params) => {
        const lifecycle =
          this.entity === 'orders'
            ? params.get('lifecycle') === 'completed'
              ? 'completed'
              : 'current'
            : '';
        let state = params.get('status') || '';
        if (state === 'awaiting_deliver') state = 'awaiting_delivering';
        if (
          this.entity === 'orders' &&
          state &&
          completedStatuses.has(state) !== (lifecycle === 'completed')
        )
          state = '';
        const sort = params.get('sort') || 'date_desc';
        const allowed =
          this.entity === 'orders'
            ? ['date_desc', 'date_asc', 'number_asc', 'number_desc']
            : ['date_desc', 'date_asc', 'amount_desc'];
        const query: ListQuery = {
          q: params.get('q') || '',
          status: state,
          scheme: params.get('scheme') || '',
          lifecycle,
          start: params.get('start') || '',
          end: params.get('end') || '',
          page: Math.max(1, Math.floor(Number(params.get('page')) || 1)),
          page_size: [25, 50, 100].includes(Number(params.get('page_size')))
            ? Number(params.get('page_size'))
            : 50,
          sort: allowed.includes(sort) ? sort : 'date_desc',
          column_filters: params.get('column_filters') || '',
        };
        this.detail.set(this.entity === 'orders' ? params.get('posting') : null);
        for (const [key, control] of Object.entries(this.form.controls))
          control.setValue(String(query[key as keyof ListQuery] ?? ''), { emitEvent: false });
        this.query.set(query);
        return query;
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    );
    combineLatest([queries, this.reload])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(([q]) =>
          this.api.listAll(this.entity, q).pipe(
            catchError((e) => {
              this.error.set(errorMessage(e));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((data) => {
        this.headingSort.set({ field: '', desc: false });
        this.data.set(data);
        this.loading.set(false);
        if (data?.available_label_ids) {
          const available = new Set(data.available_label_ids);
          this.selected.update((ids) => new Set([...ids].filter((id) => available.has(id))));
        }
      });
  }
  apply(page = 1) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.form.getRawValue(), page },
    });
  }
  reset() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.entity === 'orders' ? { lifecycle: this.query().lifecycle } : {},
    });
  }
  lifecycle(value: string) {
    this.form.controls['lifecycle'].setValue(value);
    const state = this.form.controls['status'].value;
    if (state && completedStatuses.has(state) !== (value === 'completed'))
      this.form.controls['status'].setValue('');
    this.apply();
  }
  tabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const value =
      event.key === 'Home'
        ? 'current'
        : event.key === 'End'
          ? 'completed'
          : this.query().lifecycle === 'current'
            ? 'completed'
            : 'current';
    this.lifecycle(value);
    (event.currentTarget as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-lifecycle="' + value + '"]')
      ?.focus();
  }
  columnChanged(change: FinanceColumnChange) {
    const rules = { ...this.columnRules() };
    if (change.rule) rules[change.field] = change.rule;
    else delete rules[change.field];
    this.form.controls['column_filters'].setValue(
      Object.keys(rules).length ? JSON.stringify(rules) : '',
    );
    this.apply();
  }
  toggle(order: Order, checked: boolean) {
    if (!canLabel(order)) return;
    this.selected.update((ids) => {
      const next = new Set(ids);
      if (checked) next.add(order.posting_number);
      else next.delete(order.posting_number);
      return next;
    });
  }
  selectAvailable() {
    this.selected.update(
      (ids) => new Set([...ids, ...this.readyRows().map((r) => r.posting_number)]),
    );
  }
  clearSelection() {
    this.selected.set(new Set());
  }
  open(posting: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { posting },
      queryParamsHandling: 'merge',
    });
  }
  close() {
    this.detail.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { posting: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  changed() {
    this.notice.set(
      'Упаковка подтверждена только в локальном макете. В Ozon ничего не отправлено.',
    );
    this.refresh();
  }
  refresh() {
    this.reload.next(this.reload.value + 1);
  }
  labels(order?: Order) {
    if (this.labelsBusy() || !this.data()?.local_preview || (order && !canLabel(order))) return;
    const ids = order ? [order.posting_number] : [...this.selected()];
    if (!ids.length) return;
    this.labelsBusy.set(true);
    this.error.set('');
    this.api
      .localLabels(ids, true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (blob) => {
          download(blob, 'labels-local-preview.pdf');
          this.labelsBusy.set(false);
          this.notice.set(
            'Скачан тестовый PDF без рабочего штрихкода. Для отгрузки он не подходит.',
          );
          this.refresh();
        },
        error: async (e) => {
          this.error.set(await downloadErrorMessage(e));
          this.labelsBusy.set(false);
        },
      });
  }
  export(excel = false) {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.error.set('');
    const request = excel
      ? this.api.localExcel(this.query(), this.data()?.local_preview === true)
      : this.api.export(this.entity, this.query());
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (blob) => {
        download(blob, excel ? 'orders-local.xlsx' : this.entity + '-local.csv');
        this.exporting.set(false);
      },
      error: async (e) => {
        this.error.set(await downloadErrorMessage(e));
        this.exporting.set(false);
      },
    });
  }
  order(row: Order | ReturnRow) {
    return row as Order;
  }
  returned(row: Order | ReturnRow) {
    return row as ReturnRow;
  }
}
