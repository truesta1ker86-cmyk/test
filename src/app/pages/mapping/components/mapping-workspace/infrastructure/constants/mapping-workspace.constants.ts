import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const MAPPING_WORKSPACE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Артикул', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Код / артикул 1С', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Квант', cellTemplate: { slot: 'cell3' } },
];

export const MAPPING_WORKSPACE_TABLE_COLUMNS2: DataTableColumn[] = [
  { field: 'column_1', header: '', cellTemplate: { slot: 'cell1' } },
  {
    field: 'column_2',
    header: '@if (c.sort) { ↕ }',
    styleClass: 'name-cell',
    cellTemplate: { slot: 'cell2' },
  },
  { field: 'column_3', header: 'Действия', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: '', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: '', cellTemplate: { slot: 'cell6' } },
  { field: 'column_7', header: '', cellTemplate: { slot: 'cell7' } },
];

export const MAPPING_WORKSPACE_TABLE_COLUMNS3: DataTableColumn[] = [
  { field: 'column_1', header: 'Код', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Артикул', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Номенклатура', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Выбор', cellTemplate: { slot: 'cell4' } },
];

export const MAPPING_WORKSPACE_TABLE_COLUMNS4: DataTableColumn[] = [
  { field: 'column_1', header: 'Артикул', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Было: код / квант', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Станет: код / квант', cellTemplate: { slot: 'cell3' } },
];

export const MAPPING_WORKSPACE_TABLE_COLUMNS5: DataTableColumn[] = [
  { field: 'column_1', header: 'Поле', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Маркетплейс', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Эталон 1С', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Результат', cellTemplate: { slot: 'cell4' } },
];

export const MAPPING_WORKSPACE_COLUMNS = [
  { key: 'name', label: 'Номенклатура / артикул', sort: 'name' },
  { key: 'mapping_status', label: 'Статус' },
  { key: 'onec_code', label: 'Код / артикул 1С' },
  { key: 'units_per_item', label: 'Штук в одной позиции', numeric: true },
  { key: 'available', label: 'Данные 1С', numeric: true },
];
