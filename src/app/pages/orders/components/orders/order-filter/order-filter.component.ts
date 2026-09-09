import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { OrderFilter } from '../../../infrastructure/interfaces/orders';
import { ORDER_SCHEMES, ORDER_STATUSES } from '../../../infrastructure/constants/orders';


@Component({
  selector: 'app-order-filter',
  templateUrl: './order-filter.component.html',
  standalone: false,
  styleUrls: ['./order-filter.component.scss'],
})
export class OrderFilterComponent implements OnInit {
  @Input() filter!: OrderFilter;
  @Output() filterChange = new EventEmitter<OrderFilter>();

  statuses = ORDER_STATUSES;
  schemes = ORDER_SCHEMES;

  lifecycle = 'current';
  status = '';
  scheme = '';
  search = '';
  sort = 'date_desc';

  ngOnInit(): void {
    this.lifecycle = this.filter.lifecycle;
    this.status = this.filter.status || '';
    this.scheme = this.filter.scheme || '';
    this.search = this.filter.search || '';
    this.sort = this.filter.sort || 'date_desc';
  }

  applyFilter(): void {
    this.filterChange.emit({
      lifecycle: this.lifecycle as 'current' | 'completed',
      status: this.status || undefined,
      scheme: this.scheme || undefined,
      search: this.search || undefined,
      sort: this.sort as any,
      page: 1,
      pageSize: this.filter.pageSize,
    });
  }

  resetFilter(): void {
    this.lifecycle = 'current';
    this.status = '';
    this.scheme = '';
    this.search = '';
    this.sort = 'date_desc';
    this.applyFilter();
  }
}