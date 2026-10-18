import type { DataTableColumn } from '../../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
export const INVENTORY_TABLE_COLUMNS: DataTableColumn[] = [
  { field: 'selection', header: 'Выбор', cellTemplate: { slot: 'cell1' } },
  { field: 'product', header: 'Товар', cellTemplate: { slot: 'cell2' } },
  { field: 'physical_1c', header: 'Физический 1С, уп.', cellTemplate: { slot: 'cell3' } },
  { field: 'reserved_1c', header: 'Резерв 1С, уп.', cellTemplate: { slot: 'cell4' } },
  { field: 'protected_fbs_orders', header: 'Заказы FBS, уп.', cellTemplate: { slot: 'cell5' } },
  { field: 'calculated_publishable', header: 'Расчёт 1С, уп.', cellTemplate: { slot: 'cell6' } },
  { field: 'safe_publishable', header: 'Безопасно, уп.', cellTemplate: { slot: 'cell7' } },
  { field: 'ozon_fbs_available', header: 'Ozon, уп.', cellTemplate: { slot: 'cell8' } },
  { field: 'ozon_fbs_reserved', header: 'Резерв Ozon', cellTemplate: { slot: 'cell9' } },
  { field: 'difference', header: 'Разница', cellTemplate: { slot: 'cell10' } },
  { field: 'status', header: 'Состояние', cellTemplate: { slot: 'cell11' } },
];
