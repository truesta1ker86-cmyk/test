import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const CATALOG_PRODUCT_DETAILS_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Дата доставки', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Штук', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Выручка', cellTemplate: { slot: 'cell3' } },
];
