import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Order, OrderFilter } from '../../../infrastructure/interfaces/orders';
import { OrderService } from '../../../infrastructure/services/order.service';
import { ORDER_SCHEMES, ORDER_STATUSES } from '../../../infrastructure/constants/orders';
import { DataTableColumn } from '../../../../../shared/data-table/components/data-table/models/data-table-config.model';



@Component({
  selector: 'app-order-list',
  standalone: false,
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss'],
})
export class OrderListComponent implements OnInit {
  @Input() orders: Order[] = [];
  @Input() total = 0;
  @Input() loading = false;
  @Input() filter!: OrderFilter;
  @Output() selectionChange = new EventEmitter<Order[]>();
  @Output() pageChange = new EventEmitter<any>();

  selectedOrders: Order[] = [];
  displayDetailModal = false;
  selectedOrder: Order | null = null;

  columns: DataTableColumn[] = [
    { field: 'posting_number', header: 'Номер', sortable: true, width: '180px' },
    { field: 'scheme', header: 'Схема', width: '100px' },
    { field: 'status', header: 'Статус', sortable: true, width: '180px' },
    { field: 'created_at', header: 'Дата заказа', sortable: true, width: '170px' },
    { field: 'items', header: 'Состав', width: '250px' },
    { field: 'total_price', header: 'Сумма', sortable: true, width: '120px' },
    { field: 'actions', header: 'Действия', width: '200px' },
  ];


  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.selectionChange.emit(this.selectedOrders);
  }

  onSelectionChange(selection: Order[]): void {
    this.selectedOrders = selection;
    this.selectionChange.emit(selection);
  }

  openDetail(order: Order): void {
    this.selectedOrder = order;
    this.displayDetailModal = true;
  }

  onPage(event: any): void {
    this.pageChange.emit(event);
  }

  canDownloadLabel(order: Order): boolean {
    return order.scheme === 'fbs' &&
      (order.status === 'awaiting_delivering' || order.status === 'awaiting_deliver');
  }

  downloadLabel(order: Order): void {
    this.orderService.downloadLabel(order.posting_number).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${order.posting_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // Типизированный возврат для severity
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, any> = {
      delivered: 'success',
      cancelled: 'danger',
      not_accepted: 'danger',
      delivering: 'info',
      driver_pickup: 'info',
      awaiting_registration: 'warn',
      acceptance_in_progress: 'warn',
      awaiting_approve: 'warn',
      awaiting_packaging: 'warn',
      awaiting_delivering: 'warn',
      arbitration: 'warn',
      client_arbitration: 'warn',
    };
    return map[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    const found = ORDER_STATUSES.find(s => s.value === status);
    return found ? found.label : status;
  }

  getSchemeLabel(scheme: string): string {
    const found = ORDER_SCHEMES.find(s => s.value === scheme);
    return found ? found.label : scheme;
  }

  getSchemeSeverity(scheme: string): 'info' | 'secondary' {
    return scheme === 'fbo' ? 'info' : 'secondary';
  }
}