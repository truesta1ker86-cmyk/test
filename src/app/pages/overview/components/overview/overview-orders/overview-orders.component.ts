import { Component, OnInit, signal, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Table } from 'primeng/table';
import { OrderOperation } from './infrastructure/interfaces/order-operation';

@Component({
  selector: 'app-overview-orders',
  standalone: false,
  templateUrl: './overview-orders.component.html',
  styleUrls: ['./overview-orders.component.scss']
})
export class OverviewOrdersComponent implements OnInit {
  // Input-сигнал Angular 20 для получения данных от родителя
  ordersInput = input<OrderOperation[]>([], { alias: 'orders' });

  // Локальные сигналы состояния данных и направления сортировки
  orders = signal<OrderOperation[]>([]);
  currentSortColumn = signal<keyof OrderOperation | null>(null);
  isAscending = signal<boolean>(true);

  ngOnInit(): void {
    // Инициализация мок-данных, если ничего не передано сверху
    if (this.ordersInput().length === 0) {
      this.orders.set([
        { id: '45414821-0341-5', status: 'Отменён', sku: 'REMT-0012', amount: null },
        { id: '0121931913-0109-1', status: 'Доставлен', sku: 'REMT-0009', amount: null },
        { id: '86715688-0196-2', status: 'Отменён', sku: 'REMT-0007', amount: null },
        { id: '49434835-0373-1', status: 'Доставлен', sku: 'REMT-0013', amount: null },
        { id: '0133796342-0054-1', status: 'Доставлен', sku: 'REMT-0006', amount: null }
      ]);
    } else {
      this.orders.set([...this.ordersInput()]);
    }
  }

  // Сортировка на базе обновления сигналов
  sort(column: keyof OrderOperation): void {
    if (this.currentSortColumn() === column) {
      this.isAscending.update(val => !val);
    } else {
      this.currentSortColumn.set(column);
      this.isAscending.set(true);
    }

    const direction = this.isAscending() ? 1 : -1;

    this.orders.update(currentOrders => {
      return [...currentOrders].sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
      });
    });
  }
}
