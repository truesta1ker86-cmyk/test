import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const OVERVIEW_PAGE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Отправление', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Статус', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Создано', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Сумма', styleClass: 'numeric', cellTemplate: { slot: 'cell4' } },
];

export const OVERVIEW_PAGE_TABLE_COLUMNS2: DataTableColumn[] = [
  { field: 'column_1', header: 'Когда', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Раздел', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Результат', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Записей', styleClass: 'numeric', cellTemplate: { slot: 'cell4' } },
  {
    field: 'column_5',
    header: 'Подробности',
    styleClass: 'operation-error',
    cellTemplate: { slot: 'cell5' },
  },
];
