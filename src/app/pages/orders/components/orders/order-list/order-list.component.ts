import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { WorkspaceApi } from '../../../infrastructure/services/workspace-api.service';
import type { ColumnValuesRequest } from '../../../../../shared/directives/filter-panel/infrastructure/interfaces/column-rule.interfaces';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  DestroyRef,
} from '@angular/core';
import type { DataTableColumn } from '../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type {
  ListPage,
  ListQuery,
  Order,
  ColumnValuesState,
} from '../../../infrastructure/interfaces/contracts.interfaces';
import type {
  ColumnChange,
  ColumnRules,
} from '../../../../../shared/directives/filter-panel/filter-panel';
import { date } from '../../../../../core/infrastructure/utils/format.utils';
import { currency, quantity, status } from '../../../infrastructure/utils/format.utils';
import { canLabel, orderActionLabel } from '../../../infrastructure/utils/operational-logic.utils';
import type { CheckboxChangeEvent } from 'primeng/checkbox';

@Component({
  selector: 'app-order-list',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
  styleUrls: ['../../orders/orders.component.css'],
})
export class OrderListComponent {
  readonly cdr = inject(ChangeDetectorRef);
  private readonly api = inject(WorkspaceApi);
  private readonly destroy = inject(DestroyRef);
  private choiceRequest?: Subscription;
  readonly choices = signal<ColumnValuesState>({
    field: '',
    values: [],
    busy: false,
    error: '',
    total: 0,
    hasMore: false,
  });

  loadChoices(field: string, request: ColumnValuesRequest) {
    this.choiceRequest?.unsubscribe();
    this.choices.set({ field, values: [], busy: true, error: '', total: 0, hasMore: false });
    this.choiceRequest = this.api
      .columnValues('orders', this.filters(), field, request.search, request.page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (response) =>
          this.choices.set({
            field,
            values: response.values,
            counts: response.counts || {},
            busy: false,
            error: '',
            total: response.meta.total,
            hasMore: response.meta.has_more,
          }),
        error: () =>
          this.choices.set({
            field,
            values: [],
            busy: false,
            error: 'Не удалось загрузить значения.',
            total: 0,
            hasMore: false,
          }),
      });
  }
  readonly rows = input<Order[]>([], { alias: 'orders' });
  readonly data = input<ListPage | null>(null);

  readonly selected = input<Order[]>([]);

  readonly labelsBusy = input(false);
  readonly headingSort = input({ field: '', desc: false });
  readonly columnRules = input<ColumnRules>({});
  readonly filters = input<any>({});
  readonly refreshToken = input<unknown>();

  readonly selectionChange = output<Order[]>();
  readonly columnChange = output<ColumnChange>();
  readonly sortChange = output<string>();
  readonly detailRequested = output<string>();
  readonly labelRequested = output<Order>();

  readonly pageChange = output<any>();
  readonly dataLoaded = output<ListPage>();
  readonly dataFailed = output<unknown>();

  tableColumns1(): DataTableColumn[] {
    return [
      {
        field: 'selection',
        header: '',
        styleClass: 'order-select-cell',
        cellTemplate: { slot: 'cell6' },
      },
      { field: 'posting_number', header: 'Номер', cellTemplate: { slot: 'cell7' } },
      { field: 'scheme', header: 'Схема', cellTemplate: { slot: 'cell8' } },
      { field: 'status', header: 'Статус', cellTemplate: { slot: 'cell9' } },
      {
        field: 'date',
        header: 'Дата заказа',
        styleClass: 'order-date',
        cellTemplate: { slot: 'cell10' },
      },
      {
        field: 'items',
        header: 'Состав',
        styleClass: 'order-items',
        cellTemplate: { slot: 'cell11' },
      },
      {
        field: 'amount',
        header: 'Сумма',
        styleClass: 'numeric',
        cellTemplate: { slot: 'cell12' },
      },
      {
        field: 'actions',
        header: 'Действие',
        styleClass: 'order-row-actions',
        cellTemplate: { slot: 'cell13' },
      },
    ];
  }

  readonly date = date;
  readonly currency = currency;
  readonly quantity = quantity;
  readonly status = status;
  readonly canLabel = canLabel;
  actionLabel(order: Order): string {
    return this.data()?.local_preview ? orderActionLabel(order) : 'Подробнее';
  }

  order(row: Order) {
    return row;
  }

  onSelectionChange(newIds: Order[]) {
    this.selectionChange.emit(newIds);
  }

  toggleCheckbox(order: Order, event: CheckboxChangeEvent): void {
    event.originalEvent?.stopPropagation();
    const selected = this.selected();
    this.selectionChange.emit(
      event.checked
        ? selected.some((row) => row.posting_number === order.posting_number)
          ? selected
          : [...selected, order]
        : selected.filter((row) => row.posting_number !== order.posting_number),
    );
  }

  onColumnChange(event: ColumnChange): void {
    this.columnChange.emit(event);
  }
  onSortChange(event: string): void {
    this.sortChange.emit(event);
  }
  onPageChange(event: any): void {
    this.pageChange.emit(event);
  }
  onDataLoaded(data: any): void {
    this.dataLoaded.emit(data as ListPage);
  }

  openDetail(order: Order): void {
    this.detailRequested.emit(order.posting_number);
  }
  downloadLabel(order: Order): void {
    if (canLabel(order)) this.labelRequested.emit(order);
  }
}
