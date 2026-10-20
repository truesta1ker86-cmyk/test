import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const FINANCE_PAGE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Месяц', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Начисления магазина', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'База распределения', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Коэффициент', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Распределено', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Разница', cellTemplate: { slot: 'cell6' } },
];

export const FINANCE_PAGE_API_ROOT = '/v2/api/workspace-v2/finance';

export const FINANCE_PAGE_TABS = [
  ['profit', 'Сводная'],
  ['gross', 'Валовая'],
  ['weekly', 'Продажи по неделям'],
  ['accruals', 'Начисления'],
  ['operations', 'Операции'],
  ['common', 'Общие начисления'],
  ['market', 'Рынок'],
] as const;

export const FINANCE_PAGE_FACET_FIELDS = [
  ['report_category', 'Категории'],
  ['report_type', 'Типы в отчёте'],
  ['brand', 'Бренд'],
  ['series', 'Серия'],
  ['color', 'Цвет'],
  ['length_mm', 'Длина, мм'],
  ['product_group', 'Подгруппа'],
  ['fin_type', 'Тип Фин'],
] as const;
export const FINANCE_MARKET_PAGE_SIZE = 50;
