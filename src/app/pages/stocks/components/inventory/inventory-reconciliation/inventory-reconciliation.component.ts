import { INVENTORY_TABLE_COLUMNS } from './infrastructure/constants/inventory-table.constants';
import { STOCKS_PAGE_LABELS } from '../../stocks-page/infrastructure/constants/stocks-page.constants';

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { StockFact } from '../../../infrastructure/interfaces/contracts.interfaces';
import { date } from '../../../../../core/infrastructure/utils/format.utils';
import { quantity } from '../../../../orders/infrastructure/utils/format.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory-reconciliation',
  standalone: false,
  templateUrl: './inventory-reconciliation.component.html',
  styleUrls: ['./inventory-reconciliation.component.scss'],
})
export class InventoryReconciliationComponent {
  @Input() items: StockFact[] = [];
  @Input() loading = false;
  @Input() selected = new Set<string>();
  @Output() selectionChange = new EventEmitter<{ offer: string; checked: boolean }>();
  readonly labels = STOCKS_PAGE_LABELS;

  @Output() openProduct = new EventEmitter<string>();

  readonly reconciliationColumns = INVENTORY_TABLE_COLUMNS;
  readonly date = date;
  readonly quantity = quantity;

  getStatusLabel(item: StockFact): string {
    if (item.status === 'ok' || item.status === 'matched') return 'Совпадает';
    if (item.status === 'blocked_increase') return 'На маркетплейсе меньше';
    if (item.status === 'decrease_required') return 'На маркетплейсе больше';
    if (item.status === 'missing_1c') return 'Нет остатка 1С';
    if (item.status === 'missing_ozon') return 'Нет FBS на маркетплейсе';
    return '—';
  }
}
