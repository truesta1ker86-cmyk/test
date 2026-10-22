import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { WorkspaceApi } from '../../infrastructure/services/workspace-api.service';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import type {
  ListPage,
  ListQuery,
  Order,
  ReturnRow,
} from '../../infrastructure/interfaces/contracts.interfaces';
import { downloadErrorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { status, download } from '../../infrastructure/utils/format.utils';
import { ColumnChange, ColumnRules } from '../../../../shared/directives/filter-panel/filter-panel';
import { canLabel, sortOperational } from '../../infrastructure/utils/operational-logic.utils';
import {
  completedStatuses,
  orderStatuses,
} from '../../infrastructure/constants/operational-logic.constants';
import { TABLE_DATA_SERVICE } from '../../../../shared/data-table/infrastructure/tokens/table-data-source.token';
import { GroupsLabels } from './infrastructure/constants/groups-labels';
import { Groups } from './infrastructure/enums/groups';
import { GroupsList } from './infrastructure/constants/groups-list';

@Component({
  providers: [{ provide: TABLE_DATA_SERVICE, useExisting: WorkspaceApi }, FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent {
  private readonly api = inject(WorkspaceApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);

  readonly databaseCopy = inject(SessionContext).databaseCopy;
  readonly entity = this.route.snapshot.data['entity'] as 'orders' | 'returns';

  readonly data = signal<ListPage | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly labelsBusy = signal(false);
  readonly refreshVersion = signal(0);

  // ХРАНИМ МАССИВ ОБЪЕКТОВ
  readonly selected = signal<Order[]>([]);

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

  readonly groups = Groups;
  readonly groupsLabels = GroupsLabels;
  readonly groupsList = GroupsList;

  sortHeading(field: string) {
    this.headingSort.update((s) => ({
      field,
      desc: s.field === field ? !s.desc : false,
    }));
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

  readonly columnRules = computed<ColumnRules>(() => {
    try {
      const v = JSON.parse(this.query().column_filters || '{}');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  });

  readonly scopeTotal = computed(() => {
    const summary = this.data()?.summary;
    if (!summary) return undefined;
  
    if (this.entity === 'orders') {
      const lifecycle = this.query().lifecycle;
      if (lifecycle && isSummaryKey(lifecycle)) {
        return summary[lifecycle];
      }
      return summary.total; // fallback
    }
  
    return summary.total;
  });

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
    this.data()?.local_preview
      ? (this.data()?.items || []).map((r) => r as Order).filter(canLabel)
      : [],
  );

  // АДАПТИРОВАНО ПОД ОБЪЕКТЫ
  readonly hiddenSelected = computed(
    () =>
      this.selected().filter(
        (o) => !this.data()?.items.some((r) => r.posting_number === o.posting_number),
      ).length,
  );

  readonly status = status;
  readonly canLabel = canLabel;

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => {
          const param = params.get('lifecycle') as keyof typeof Groups | null;

          const lifecycle =
            this.entity === 'orders'
              ? param && Groups[param]
              ? Groups[param] : ''
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

          for (const [key, control] of Object.entries(this.form.controls)) {
            control.setValue(String(query[key as keyof ListQuery] ?? ''), { emitEvent: false });
          }

          return query;
        }),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((query) => {
        this.query.set(query);
        this.loading.set(true);
      });
  }

  onFilterChange(filter: ListQuery): void {
    for (const [key, control] of Object.entries(this.form.controls)) {
      control.setValue(String(filter[key as keyof ListQuery] ?? ''), { emitEvent: false });
    }
    this.apply();
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
    if (state && completedStatuses.has(state) !== (value === 'completed')) {
      this.form.controls['status'].setValue('');
    }
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

  columnChanged(change: ColumnChange) {
    const rules = { ...this.columnRules() };
    if (change.rule) rules[change.field] = change.rule;
    else delete rules[change.field];
    this.form.controls['column_filters'].setValue(
      Object.keys(rules).length ? JSON.stringify(rules) : '',
    );
    this.apply();
  }

  // ИСПРАВЛЕННЫЙ TOGGLE (РАБОТАЕТ С ОБЪЕКТАМИ)
  toggle(order: Order, checked: boolean) {
    if (!canLabel(order)) return;

    this.selected.update((orders) => {
      const exists = orders.some((o) => o.posting_number === order.posting_number);

      if (checked) {
        return exists ? orders : [...orders, order];
      }
      return orders.filter((o) => o.posting_number !== order.posting_number);
    });
  }

  // ИСПРАВЛЕННЫЙ SELECT AVAILABLE
  selectAvailable() {
    this.selected.update((orders) => {
      const available = this.readyRows();
      const map = new Map(orders.map((o) => [o.posting_number, o]));
      available.forEach((o) => map.set(o.posting_number, o));
      return Array.from(map.values());
    });
  }

  clearSelection() {
    this.selected.set([]);
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
    this.loading.set(true);
    this.refreshVersion.update((value) => value + 1);
  }

  onDataLoaded(data: ListPage) {
    this.data.set(data);
    this.loading.set(false);
    this.error.set('');
    if (data?.local_preview && data.available_label_ids) {
      const available = new Set(data.available_label_ids);
      // Фильтруем массив объектов
      this.selected.update((orders) => orders.filter((o) => available.has(o.posting_number)));
    }
  }

  onPageChange(event: any) {
    this.form.controls['page_size'].setValue(String(event.rows));
    const page = event.first / event.rows + 1;
    this.apply(page);
  }

  onDataError() {
    this.data.set(null);
    this.loading.set(false);
    this.error.set('Не удалось загрузить список. Повторите запрос.');
  }

  labels(order?: Order) {
    if (this.labelsBusy() || !this.data()?.local_preview || (order && !canLabel(order))) return;

    // Формируем массив строк ID из объектов
    const ids = order ? [order.posting_number] : this.selected().map((o) => o.posting_number);

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
    const request = this.api.export(this.entity, this.query(), excel ? 'xlsx' : 'csv');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (blob) => {
        download(blob, this.entity + '-v2.' + (excel ? 'xlsx' : 'csv'));
        this.exporting.set(false);
      },
      error: async (e) => {
        this.error.set(await downloadErrorMessage(e));
        this.exporting.set(false);
      },
    });
  }

  statusOptions() {
    return [
      {
        value: '',
        label: String(
          this.query().lifecycle === 'completed'
            ? 'Все завершённые статусы'
            : 'Все текущие статусы',
        ),
      },
      ...this.statuses().flatMap((s) => [{ value: String(s), label: String(this.status(s)) }]),
    ];
  }
}
