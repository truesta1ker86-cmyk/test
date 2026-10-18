import { INVENTORY_TABLE_COLUMNS } from './infrastructure/constants/inventory-table.constants';

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { RawStock } from '../../../infrastructure/interfaces/contracts.interfaces';
import { date } from '../../../../../core/infrastructure/utils/format.utils';
import { quantity } from '../../../../orders/infrastructure/utils/format.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory-detail',
  standalone: false,
  templateUrl: './inventory-detail.component.html',
  styleUrls: ['./inventory-detail.component.scss'],
})
export class InventoryDetailComponent {
  @Input() stocks: RawStock[] = [];
  @Input() loading = false;

  readonly detailColumns = INVENTORY_TABLE_COLUMNS;
  readonly date = date;
  readonly quantity = quantity;

  getTotalAvailable(offerId: string): number {
    return this.stocks
      .filter((s) => s.offer_id === offerId && s.source === '1c')
      .reduce((sum, s) => sum + (s.available || 0), 0);
  }

  getWarehouseCount(offerId: string): number {
    const warehouses = new Set(
      this.stocks
        .filter((s) => s.offer_id === offerId && s.source === '1c' && s.warehouse_id)
        .map((s) => s.warehouse_id),
    );
    return warehouses.size;
  }
}
