import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const ACCOUNT_PAGE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Магазин', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Client-Id', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Подключения', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Снимок', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Действия', cellTemplate: { slot: 'cell5' } },
];

export const ACCOUNT_PAGE_TABLE_COLUMNS2: DataTableColumn[] = [
  { field: 'column_1', header: 'Сотрудник', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Роль', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Создан', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Состояние', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
];

export const ACCOUNT_PAGE_TABLE_COLUMNS3: DataTableColumn[] = [
  { field: 'column_1', header: 'Время', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Описание', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Состояние', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Сумма', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Баланс после', cellTemplate: { slot: 'cell5' } },
];

export const ACCOUNT_PAGE_TABLE_COLUMNS4: DataTableColumn[] = [
  { field: 'column_1', header: 'Дата', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Сумма', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Состояние', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Комментарий', cellTemplate: { slot: 'cell4' } },
];

export const ACCOUNT_PAGE_TABLE_COLUMNS5: DataTableColumn[] = [
  { field: 'column_1', header: 'Артикул 1С', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Себестоимость', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Источник', cellTemplate: { slot: 'cell3' } },
];

export const ACCOUNT_PAGE_ROLES: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  stock_operator: 'Оператор склада',
  viewer: 'Наблюдатель',
};

export const ACCOUNT_PAGE_API_ROOT = '/v2/api/workspace-v2/account';
