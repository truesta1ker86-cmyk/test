import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const PRODUCT_DETAILS_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Показатель', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'За период', cellTemplate: { slot: 'cell2' } },
];
