import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const facetFields = [
  { key: 'category', label: 'Категория Ozon' },
  { key: 'type', label: 'Тип Ozon' },
  { key: 'brand', label: 'Бренд' },
  { key: 'fin_type', label: 'Тип Фин' },
  { key: 'report_category', label: 'Категория отчёта' },
  { key: 'report_type', label: 'Тип отчёта' },
  { key: 'product_group', label: 'Группа товаров' },
  { key: 'series', label: 'Серия' },
  { key: 'color', label: 'Цвет' },
  { key: 'length_mm', label: 'Длина, мм' },
  { key: 'package_qty', label: 'Упаковка по названию' },
  { key: 'units_per_item', label: 'Квант карточки' },
  { key: 'state', label: 'Статус карточки' },
] as const;

export const CATALOG_PAGE_COMPONENT_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Когда', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Действие', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Товаров', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Статус', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
];

export const CATALOG_PAGE_COMPONENT_RULE_FIELDS = [
  { key: 'name', label: 'Название' },
  { key: 'offer_id', label: 'Артикул' },
  { key: 'brand', label: 'Бренд' },
  { key: 'fin_type', label: 'Тип Фин' },
  { key: 'report_category', label: 'Категория отчёта' },
  { key: 'report_type', label: 'Тип отчёта' },
  { key: 'units_per_item', label: 'Квант' },
  { key: 'price', label: 'Цена Ozon' },
  { key: 'cost_price', label: 'Ручная стоимость упаковки' },
  { key: 'state', label: 'Статус карточки' },
];

export const CATALOG_PAGE_COMPONENT_OPERATORS = [
  { key: 'contains', label: 'Содержит' },
  { key: 'not_contains', label: 'Не содержит' },
  { key: 'eq', label: 'Равно' },
  { key: 'neq', label: 'Не равно' },
  { key: 'starts_with', label: 'Начинается с' },
  { key: 'gt', label: 'Больше' },
  { key: 'gte', label: 'Не меньше' },
  { key: 'lt', label: 'Меньше' },
  { key: 'lte', label: 'Не больше' },
  { key: 'is_empty', label: 'Пусто' },
  { key: 'is_not_empty', label: 'Заполнено' },
  { key: 'in', label: 'Входит в список' },
  { key: 'not_in', label: 'Не входит в список' },
];
