
import { Component, Input } from '@angular/core';
import { Stock } from '../../../infrastructure/models/stock.model';
import { DataTableColumn } from '../../../../../shared/data-table/components/data-table/models/data-table-config.model';


@Component({
  selector: 'app-inventory-detail',
  standalone: false, 
  templateUrl: './inventory-detail.component.html',
  styleUrls: ['./inventory-detail.component.scss'],
})
export class InventoryDetailComponent {
    @Input() stocks: Stock[] = [];
    @Input() loading = false;

    detailColumns: DataTableColumn[] = [
        { field: 'source', header: 'Источник', width: '100px' },
        { field: 'product', header: 'Товар', width: '260px' },
        { field: 'warehouse_name', header: 'Склад', width: '150px' },
        { field: 'total', header: 'Всего по складам', width: '140px' },
        { field: 'available', header: 'Доступно', width: '100px' },
        { field: 'reserved', header: 'Резерв', width: '100px' },
        { field: 'shipping', header: 'В пути', width: '100px' },
      ];
  
    getTotalAvailable(offerId: string): number {
      return this.stocks
        .filter(s => s.offer_id === offerId && s.source === '1c')
        .reduce((sum, s) => sum + (s.available || 0), 0);
    }
  
    getWarehouseCount(offerId: string): number {
      const warehouses = new Set(
        this.stocks
          .filter(s => s.offer_id === offerId && s.source === '1c' && s.warehouse_id)
          .map(s => s.warehouse_id)
      );
      return warehouses.size;
    }
}