import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, input, output } from '@angular/core';
import type { DataTableColumn } from '../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type { ListPage, ListQuery, Order, ReturnRow } from '../../../infrastructure/interfaces/contracts.interfaces';
import type { ColumnChange, ColumnRules } from '../../../../../shared/directives/filter-panel/filter-panel';
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
  readonly cdr = inject(ChangeDetectorRef);
  readonly entity = input<'orders' | 'returns'>('orders');
  readonly rows = input<(Order | ReturnRow)[]>([], { alias: 'orders' }); 
  readonly data = input<ListPage | null>(null); 
  
  readonly selected = input<Order[]>([]);       ;
  
  readonly labelsBusy = input(false);
  readonly headingSort = input({ field: '', desc: false });
  readonly columnRules = input<ColumnRules>({});
  readonly filters = input<any>({});

  readonly selectionChange = output<Order[]>(); 
  readonly columnChange = output<ColumnChange>();
  readonly sortChange = output<string>();
  readonly detailRequested = output<string>();
  readonly labelRequested = output<Order>();
  
  readonly pageChange = output<any>();
  readonly dataLoaded = output<ListPage>();
 

  tableColumns1(): DataTableColumn[] {
    return [
      ...(this.entity() === 'orders'
        ? [
            { field: 'selection', header: '', styleClass: 'order-select-cell', cellTemplate: { slot: 'cell6' } },
            { field: 'posting_number', header: 'Номер', cellTemplate: { slot: 'cell7' } },
            { field: 'scheme', header: 'Схема', cellTemplate: { slot: 'cell8' } },
            { field: 'status', header: 'Статус', cellTemplate: { slot: 'cell9' } },
            { field: 'created_at', header: 'Дата заказа', styleClass: 'order-date', cellTemplate: { slot: 'cell10' } },
            { field: 'items', header: 'Состав', styleClass: 'order-items', cellTemplate: { slot: 'cell11' } },
            { field: 'total_price', header: 'Сумма', styleClass: 'numeric', cellTemplate: { slot: 'cell12' } },
            { field: 'actions', header: 'Действие', styleClass: 'order-row-actions', cellTemplate: { slot: 'cell13' } },
          ]
        : [
            { field: 'posting_number', header: 'Номер', cellTemplate: { slot: 'cell1' } },
            { field: 'offer_id', header: 'Артикул', cellTemplate: { slot: 'cell2' } },
            { field: 'returns_amount', header: 'Действия', styleClass: 'numeric', cellTemplate: { slot: 'cell3' } },
            { field: 'returned_at', header: '', cellTemplate: { slot: 'cell4' } },
            { field: 'status', header: 'Статус', cellTemplate: { slot: 'cell5' } },
          ]),
    ];
  }

  readonly date = date;
  readonly currency = currency;
  readonly quantity = quantity;
  readonly status = status;
  readonly canLabel = canLabel;
  readonly actionLabel = orderActionLabel;

  order(row: Order | ReturnRow) { return row as Order; }
  returned(row: Order | ReturnRow) { return row as ReturnRow; }


  onSelectionChange(newIds: Order[]) {
    this.selectionChange.emit(newIds);
  }

  onColumnChange(event: ColumnChange): void { this.columnChange.emit(event); }
  onSortChange(event: string): void { this.sortChange.emit(event); }
  onPageChange(event: any): void { this.pageChange.emit(event); }
  onDataLoaded(data: any): void { this.dataLoaded.emit(data as ListPage); }

  openDetail(order: Order): void { this.detailRequested.emit(order.posting_number); }
  downloadLabel(order: Order): void { if (canLabel(order)) this.labelRequested.emit(order); }
}
