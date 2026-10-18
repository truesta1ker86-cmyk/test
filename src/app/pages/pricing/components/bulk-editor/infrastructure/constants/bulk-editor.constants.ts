import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const BULK_EDITOR_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Артикул', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Было', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Станет', cellTemplate: { slot: 'cell3' } },
];
