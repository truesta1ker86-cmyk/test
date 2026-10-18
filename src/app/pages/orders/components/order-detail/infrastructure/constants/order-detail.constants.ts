import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const ORDER_DETAILS_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Товар', cellTemplate: { slot: 'cell1' } },
  {
    field: 'column_2',
    header: 'Количество',
    styleClass: 'numeric',
    cellTemplate: { slot: 'cell2' },
  },
  {
    field: 'column_3',
    header: 'Цена позиции',
    styleClass: 'numeric',
    cellTemplate: { slot: 'cell3' },
  },
];
