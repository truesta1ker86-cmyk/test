import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const STOCKS_PAGE_TABLE_COLUMNS10: DataTableColumn[] = [
  { field: 'column_1', header: 'Товар', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Ожидается, уп.', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Склад', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'К показу, уп.', cellTemplate: { slot: 'cell4' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Выбор', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Товар', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Физический 1С, уп.', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Резерв 1С, уп.', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Заказы FBS, уп.', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Расчёт 1С, уп.', cellTemplate: { slot: 'cell6' } },
  { field: 'column_7', header: 'Безопасно, уп.', cellTemplate: { slot: 'cell7' } },
  { field: 'column_8', header: 'Ozon, уп.', cellTemplate: { slot: 'cell8' } },
  { field: 'column_9', header: 'Резерв Ozon', cellTemplate: { slot: 'cell9' } },
  { field: 'column_10', header: 'Разница', cellTemplate: { slot: 'cell10' } },
  { field: 'column_11', header: 'Состояние', cellTemplate: { slot: 'cell11' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS2: DataTableColumn[] = [
  { field: 'column_1', header: 'Источник', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Артикул / код', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Склад', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Доступно', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Резерв', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Обновлено', cellTemplate: { slot: 'cell6' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS3: DataTableColumn[] = [
  { field: 'column_1', header: 'Артикул', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Склад Ozon', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Режим', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Доля / цель', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Кратность', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Состояние', cellTemplate: { slot: 'cell6' } },
  { field: 'column_7', header: 'Последняя отправка в снимке', cellTemplate: { slot: 'cell7' } },
  { field: 'column_8', header: '', cellTemplate: { slot: 'cell8' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS4: DataTableColumn[] = [
  { field: 'column_1', header: 'Артикул', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Склад', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Доступно 1С', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Результат, уп.', cellTemplate: { slot: 'cell4' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS5: DataTableColumn[] = [
  { field: 'column_1', header: 'Товар', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Физический остаток 1С, ед.', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Ожидаемое количество', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: '', cellTemplate: { slot: 'cell4' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS7: DataTableColumn[] = [
  { field: 'column_1', header: 'Товар', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Дата', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Ожидается', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Уже в 1С', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Состояние', cellTemplate: { slot: 'cell5' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS8: DataTableColumn[] = [
  { field: 'column_1', header: 'Источник', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Артикул / код', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Склад', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Доступно', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Резерв', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Обновлено', cellTemplate: { slot: 'cell6' } },
];

export const STOCKS_PAGE_TABLE_COLUMNS9: DataTableColumn[] = [
  { field: 'column_1', header: 'Время', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Операция', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Состояние', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Результат', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
];

export const STOCKS_PAGE_LABELS: Record<string, string> = {
  matched: 'Совпадает',
  blocked_increase: 'Увеличение требует проверки',
  decrease_required: 'Требуется снижение',
  missing_1c: 'Нет данных 1С',
  missing_ozon: 'Нет снимка Ozon',
  zero_1c: 'Нулевой остаток 1С',
  zero_ozon: 'Нулевой остаток маркетплейса',
  active: 'Ожидается',
  arrived: 'Поступило',
  cancelled: 'Отменено',
  received: 'Поступило',
  expired: 'Срок ожидания истёк',
};

export const STOCKS_PAGE_TABS = [
  ['reconciliation', 'Общий остаток'],
  ['matrix', 'Распределение по складам'],
  ['rules', 'Правила'],
  ['expected', 'Поставки'],
  ['warehouses', 'Склады'],
  ['history', 'История'],
] as const;
