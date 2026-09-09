import { Component } from '@angular/core';
import { OrderService } from '../../infrastructure/services/order.service';
import { Order, OrderFilter } from '../../infrastructure/interfaces/orders';


@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  providers: [
    OrderService
  ]
})
export class OrdersComponent {

  pageTitle = 'Заказы';
  pageSubtitle = 'Обработка FBS и контроль статусов FBO';

  orders: Order[] = [];
  total = 0;
  filter: OrderFilter = { lifecycle: 'current', page: 1, pageSize: 50, sort: 'date_desc' };
  selectedOrders: Order[] = [];
  loading = false;


  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getOrders(this.filter).subscribe({
      next: (resp) => {
        this.orders = resp.items;
        this.total = resp.summary.total;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onFilterChange(filter: OrderFilter): void {
    this.filter = { ...this.filter, ...filter, page: 1 };
    this.loadOrders();
  }

  onPageChange(event: any): void {
    this.filter.page = event.page + 1;
    this.filter.pageSize = event.rows;
    this.loadOrders();
  }

  onRefresh(): void {
    this.orderService.refreshOrders().subscribe(() => this.loadOrders());
  }

  onSelectionChange(selected: Order[]): void {
    this.selectedOrders = selected;
  }

  onPrintLabels(): void {
    const postingNumbers = this.selectedOrders.map(o => o.posting_number);
    this.orderService.downloadLabels(postingNumbers).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labels_${postingNumbers.length}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}