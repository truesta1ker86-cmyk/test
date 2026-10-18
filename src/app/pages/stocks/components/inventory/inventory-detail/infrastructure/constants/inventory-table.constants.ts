import type { DataTableColumn } from '../../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
export const INVENTORY_TABLE_COLUMNS: DataTableColumn[] = [
  { field: 'source', header: 'Источник', cellTemplate: { slot: 'cell1' } },
  { field: 'product', header: 'Артикул / код', cellTemplate: { slot: 'cell2' } },
  { field: 'warehouse_name', header: 'Склад', cellTemplate: { slot: 'cell3' } },
  { field: 'available', header: 'Доступно', cellTemplate: { slot: 'cell4' } },
  { field: 'reserved', header: 'Резерв', cellTemplate: { slot: 'cell5' } },
  { field: 'measured_at', header: 'Обновлено', cellTemplate: { slot: 'cell6' } },
];
