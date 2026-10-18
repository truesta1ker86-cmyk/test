import {
  ORDER_SCHEMES,
  ORDER_LIFECYCLES,
  ORDER_SORTS,
  RETURN_SORTS,
} from './infrastructure/constants/order-filter.constants';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import type { ListQuery as OrderFilter } from '../../../infrastructure/interfaces/contracts.interfaces';
import { FilterService } from '../../../../../shared/directives/filter-panel/infrastructure/services/filter.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FilterService],
  selector: 'app-order-filter',
  templateUrl: './order-filter.component.html',
  standalone: false,
  styleUrls: ['../../orders/orders.component.css'],
})
export class OrderFilterComponent implements OnChanges {
  @Input() filter!: OrderFilter;
  @Output() filterChange = new EventEmitter<OrderFilter>();

  @Input() statuses: { value: string; label: string }[] = [];
  @Input() loading = false;
  @Input() entity: 'orders' | 'returns' = 'orders';

  readonly schemes = ORDER_SCHEMES;
  readonly lifecycles = ORDER_LIFECYCLES;
  readonly sorts = ORDER_SORTS;
  readonly returnSorts = RETURN_SORTS;
  lifecycle = 'current';
  status = '';
  scheme = '';
  search = '';
  sort = 'date_desc';

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['filter'] && !changes['entity']) return;
    this.lifecycle = this.filter.lifecycle || 'current';
    this.status = this.filter.status || '';
    this.scheme = this.filter.scheme || '';
    this.search = this.filter.q || '';
    this.sort = this.filter.sort || 'date_desc';
  }

  applyFilter(): void {
    this.filterChange.emit({
      ...this.filter,
      lifecycle: this.entity === 'orders' ? this.lifecycle : '',
      status: this.status || '',
      scheme: this.scheme || '',
      q: this.search || '',
      sort: this.sort as any,
      page: 1,
      page_size: this.filter.page_size,
    });
  }

  resetFilter(): void {
    this.lifecycle = 'current';
    this.status = '';
    this.scheme = '';
    this.search = '';
    this.sort = 'date_desc';
    this.filterChange.emit({
      ...this.filter,
      lifecycle: this.entity === 'orders' ? 'current' : '',
      status: '',
      scheme: '',
      q: '',
      sort: 'date_desc',
      column_filters: '',
      start: '',
      end: '',
      page: 1,
    });
  }
}
