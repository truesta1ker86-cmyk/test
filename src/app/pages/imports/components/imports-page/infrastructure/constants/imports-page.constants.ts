import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const IMPORTS_PAGE_TABLE_COLUMNS7: DataTableColumn[] = [
  { field: 'column_1', header: 'Запись', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Действие', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Поле', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Было', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Станет', cellTemplate: { slot: 'cell5' } },
];

export const IMPORTS_PAGE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Колонка файла', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Поле проекта', cellTemplate: { slot: 'cell2' } },
];

export const IMPORTS_PAGE_TABLE_COLUMNS3: DataTableColumn[] = [
  { field: 'column_1', header: 'Уровень', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Лист / строка', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Замечание', cellTemplate: { slot: 'cell3' } },
];

export const IMPORTS_PAGE_TABLE_COLUMNS5: DataTableColumn[] = [
  { field: 'column_1', header: 'Файл', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Загружен', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Строк', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Состояние', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Ошибки / предупреждения', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: '', cellTemplate: { slot: 'cell6' } },
];

export const IMPORTS_PAGE_TABLE_COLUMNS6: DataTableColumn[] = [
  { field: 'column_1', header: 'Профиль', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Версия', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Использований', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Последнее применение', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
];

export const IMPORTS_PAGE_STATUS_LABELS: Record<string, string> = {
  ready: 'Готов',
  warnings: 'Есть предупреждения',
  blocked: 'Есть ошибки',
  applied: 'Применён',
  duplicate: 'Уже применён',
};

export const IMPORTS_PAGE_API_ROOT = '/v2/api/workspace-v2/imports';
