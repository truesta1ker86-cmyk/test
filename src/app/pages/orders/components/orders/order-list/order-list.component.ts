import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import type { DataTableColumn } from '../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type {
  ListPage,
  ListQuery,
  Order,
  ReturnRow,
} from '../../../infrastructure/interfaces/contracts.interfaces';
import type {
  ColumnChange,
  ColumnRules,
} from '../../../../../shared/directives/filter-panel/filter-panel';
import { date } from '../../../../../core/infrastructure/utils/format.utils';
import { currency, quantity, status } from '../../../infrastructure/utils/format.utils';
import { canLabel, orderActionLabel } from '../../../infrastructure/utils/operational-logic.utils';
@Component({
  selector: 'app-order-list',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
  styleUrls: ['../../orders/orders.component.css'],
})
export class OrderListComponent {
  readonly entity = input<'orders' | 'returns'>('orders');
  readonly rows = input<(Order | ReturnRow)[]>([], { alias: 'orders' });
  readonly data = input<ListPage | null>(null);
  readonly loading = input(false);
  readonly selected = input(new Set<string>());
  readonly labelsBusy = input(false);
  readonly headingSort = input({ field: '', desc: false });
  readonly columnRules = input<ColumnRules>({});
  readonly selectionChange = output<Set<string>>();
  readonly columnChange = output<ColumnChange>();
  readonly sortChange = output<string>();
  readonly detailRequested = output<string>();
  readonly labelRequested = output<Order>();
  readonly visibleTableSelection = computed(() =>
    this.rows().filter((r) => this.selected().has((r as Order).posting_number)),
  );
  tableColumns1(): DataTableColumn[] {
    return [
      ...(this.entity() === 'orders'
        ? [
            {
              field: 'selection',
              header: '',
              styleClass: 'order-select-cell',
              cellTemplate: { slot: 'cell6' },
            },
            { field: 'posting_number', header: '', cellTemplate: { slot: 'cell7' } },
            { field: 'scheme', header: '', cellTemplate: { slot: 'cell8' } },
            { field: 'status', header: '', cellTemplate: { slot: 'cell9' } },
            {
              field: 'created_at',
              header: '',
              styleClass: 'order-date',
              cellTemplate: { slot: 'cell10' },
            },
            {
              field: 'items',
              header: '',
              styleClass: 'order-items',
              cellTemplate: { slot: 'cell11' },
            },
            {
              field: 'total_price',
              header: '',
              styleClass: 'numeric',
              cellTemplate: { slot: 'cell12' },
            },
            {
              field: 'actions',
              header: '',
              styleClass: 'order-row-actions',
              cellTemplate: { slot: 'cell13' },
            },
          ]
        : [
            { field: 'posting_number', header: '', cellTemplate: { slot: 'cell1' } },
            {
              field: 'offer_id',
              header: 'Артикул',
              cellTemplate: { slot: 'cell2' },
            },
            {
              field: 'returns_amount',
              header: 'Действия',
              styleClass: 'numeric',
              cellTemplate: { slot: 'cell3' },
            },
            { field: 'returned_at', header: '', cellTemplate: { slot: 'cell4' } },
            { field: 'status', header: '', cellTemplate: { slot: 'cell5' } },
          ]),
    ];
  }
  readonly columns = computed(() =>
    this.entity() === 'orders'
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
  readonly date = date;
  readonly currency = currency;
  readonly quantity = quantity;
  readonly status = status;
  canLabel(order: Order): boolean {
    return !!this.data()?.local_preview && canLabel(order);
  }
  actionLabel(order: Order): string {
    return this.data()?.local_preview ? orderActionLabel(order) : 'Подробнее';
  }
  order(row: Order | ReturnRow) {
    return row as Order;
  }
  returned(row: Order | ReturnRow) {
    return row as ReturnRow;
  }
  onSelectionChange(selection: Set<string>): void {
    this.selectionChange.emit(selection);
  }
  toggle(order: Order, checked: boolean) {
    if (!this.canLabel(order)) return;
    const ids = new Set(this.selected());
    checked ? ids.add(order.posting_number) : ids.delete(order.posting_number);
    this.onSelectionChange(ids);
  }
  openDetail(order: Order): void {
    this.detailRequested.emit(order.posting_number);
  }
  downloadLabel(order: Order): void {
    if (this.canLabel(order)) this.labelRequested.emit(order);
  }
}
