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
import { parseColumnRules } from '../../../../../shared/directives/filter-panel/filter-panel';

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
  start = '';
  end = '';
  opened = false;
  error = '';

  get activeCount(): number {
    return (
      [
        this.filter.q,
        this.filter.status,
        this.filter.scheme,
        this.filter.start || this.filter.end,
      ].filter(Boolean).length +
      Object.keys(parseColumnRules(this.filter.column_filters || '')).length
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['filter'] && !changes['entity']) return;
    this.readFilter();
  }

  private readFilter(): void {
    this.lifecycle = this.filter.lifecycle || 'current';
    this.status = this.filter.status || '';
    this.scheme = this.filter.scheme || '';
    this.search = this.filter.q || '';
    this.sort = this.filter.sort || 'date_desc';
    this.start = this.filter.start || '';
    this.end = this.filter.end || '';
    this.error = '';
  }

  toggleFilters(open: boolean): void {
    if (open) this.readFilter();
    this.opened = open;
  }

  applyFilter(): void {
    if (this.start && this.end && this.start > this.end) {
      this.error = 'Дата начала должна быть не позже даты окончания.';
      return;
    }
    this.error = '';
    this.filterChange.emit({
      ...this.filter,
      lifecycle: this.entity === 'orders' ? this.lifecycle : '',
      status: this.status || '',
      scheme: this.scheme || '',
      q: this.search || '',
      sort: this.sort as any,
      start: this.start || '',
      end: this.end || '',
      page: 1,
      page_size: this.filter.page_size,
    });
    this.opened = false;
  }

  resetFilter(): void {
    this.lifecycle = 'current';
    this.status = '';
    this.scheme = '';
    this.search = '';
    this.sort = 'date_desc';
    this.start = '';
    this.end = '';
    this.error = '';
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
    this.opened = false;
  }
}
