import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { OrderService } from '../../../infrastructure/services/order.service';
import { Order, OrderAction } from '../../../infrastructure/interfaces/orders';


@Component({
  selector: 'app-order-detail-modal',
  standalone: false,
  templateUrl: './order-detail-modal.component.html',
  styleUrls: ['./order-detail-modal.component.scss'],
})
export class OrderDetailModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() order: Order | null = null;
  @Output() close = new EventEmitter<void>();

  actions: OrderAction[] = [];
  marketplaceStatus = '';
  notice = '';
  statusSeverity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' = 'secondary';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadActions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.loadActions();
    }
  }

  loadActions(): void {
    if (!this.order) {
      this.actions = [];
      return;
    }
    this.orderService.getAvailableActions(this.order.posting_number).subscribe({
      next: (resp) => {
        this.actions = resp.actions || [];
        this.marketplaceStatus = resp.marketplace_status || this.order!.status;
        this.notice = resp.notice || '';
        this.statusSeverity = this.getStatusSeverity(this.marketplaceStatus);
      },
      error: () => {
        this.actions = [];
        this.notice = 'Не удалось загрузить доступные действия';
      },
    });
  }

  executeAction(actionCode: string): void {
    if (!this.order) return;
    if (!confirm('Подтвердить выполнение действия?')) return;
    this.orderService.executeAction(this.order.posting_number, actionCode).subscribe({
      next: () => {
        this.close.emit();
      },
      error: (err) => alert(err.message),
    });
  }

  private getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
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
}