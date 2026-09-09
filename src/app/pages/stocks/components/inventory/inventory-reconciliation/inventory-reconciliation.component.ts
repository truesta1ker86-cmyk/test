
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReconciliationItem } from '../../../infrastructure/models/stock.model';
import { DataTableColumn } from '../../../../../shared/data-table/components/data-table/models/data-table-config.model';


@Component({
  selector: 'app-inventory-reconciliation',
  standalone: false,
  templateUrl: './inventory-reconciliation.component.html',
  styleUrls: ['./inventory-reconciliation.component.scss'],
})
export class InventoryReconciliationComponent {
  @Input() items: ReconciliationItem[] = [];
  @Input() loading = false;

  @Output() openProduct = new EventEmitter<string>();

  reconciliationColumns: DataTableColumn[] = [
    { field: 'product', header: 'Товар', width: '260px' },
    { field: 'physical_1c', header: 'Физически в 1С', width: '140px' },
    { field: 'protected_fbs_orders', header: 'Заказы после снимка', width: '160px' },
    { field: 'calculated_publishable', header: 'Расчёт по 1С', width: '140px' },
    { field: 'safe_publishable', header: 'Безопасно к публикации', width: '160px' },
    { field: 'ozon_fbs_available', header: 'Сейчас на маркетплейсе FBS', width: '160px' },
    { field: 'status', header: 'Расхождение', width: '200px' },
    { field: 'updated_at', header: 'Обновлено', width: '180px' },
  ];


  getStatusLabel(item: ReconciliationItem): string {
    if (item.status === 'ok') return 'Совпадает';
    if (item.status === 'blocked_increase') return 'На маркетплейсе меньше';
    if (item.status === 'decrease_required') return 'На маркетплейсе больше';
    if (item.status === 'missing_1c') return 'Нет остатка 1С';
    if (item.status === 'missing_ozon') return 'Нет FBS на маркетплейсе';
    return '—';
  }
}