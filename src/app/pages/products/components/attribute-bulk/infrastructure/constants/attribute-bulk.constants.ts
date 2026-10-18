import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const ATTRIBUTE_BULK_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Карточка', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Сейчас', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'После изменения', cellTemplate: { slot: 'cell3' } },
];
