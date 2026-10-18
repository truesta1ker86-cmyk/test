import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const CATALOG_PRODUCT_GRID_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'selection', header: '', cellTemplate: { slot: 'cell1' } },
  {
    field: 'offer_id',
    header: 'Артикул',
    styleClass: 'offer-cell',
    cellTemplate: { slot: 'cell2' },
  },
  {
    field: 'name',
    header: 'Номенклатура',
    styleClass: 'name-cell',
    cellTemplate: { slot: 'cell3' },
  },
  { field: 'category_name', header: 'Категория маркетплейса', cellTemplate: { slot: 'cell4' } },
  { field: 'type_name', header: 'Тип маркетплейса', cellTemplate: { slot: 'cell5' } },
  { field: 'report_category', header: 'FIN-категория', cellTemplate: { slot: 'cell6' } },
  { field: 'report_type', header: 'FIN-тип', cellTemplate: { slot: 'cell7' } },
  { field: 'fixed_margin', header: 'Целевая маржа, %', cellTemplate: { slot: 'cell8' } },
  { field: 'units_sold', header: 'Доставлено', cellTemplate: { slot: 'cell9' } },
  { field: 'price', header: 'Цена, ₽', cellTemplate: { slot: 'cell10' } },
  { field: 'package_cost', header: 'Себес × квант', cellTemplate: { slot: 'cell11' } },
  { field: 'promotion_model_title', header: 'Модель акций', cellTemplate: { slot: 'cell12' } },
  {
    field: 'actions',
    header: 'Действия',
    styleClass: 'row-actions',
    cellTemplate: { slot: 'cell13' },
  },
];

export const CATALOG_PRODUCT_GRID_COLUMNS = [
  { key: 'offer_id', label: 'Артикул', sort: 'offer_id' },
  { key: 'name', label: 'Номенклатура', sort: 'name' },
  { key: 'category_name', label: 'Категория маркетплейса' },
  { key: 'type_name', label: 'Тип маркетплейса' },
  { key: 'report_category', label: 'FIN-категория' },
  { key: 'report_type', label: 'FIN-тип' },
  { key: 'fixed_margin', label: 'Целевая маржа, %', numeric: true },
  { key: 'units_sold', label: 'Доставлено', numeric: true, sort: 'units_sold' },
  { key: 'price', label: 'Цена, ₽', numeric: true, sort: 'price' },
  { key: 'package_cost', label: 'Себес × квант', numeric: true, sort: 'package_cost' },
  { key: 'promotion_model_title', label: 'Модель акций' },
];
