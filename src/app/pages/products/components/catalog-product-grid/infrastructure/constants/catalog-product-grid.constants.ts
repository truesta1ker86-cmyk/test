import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const CATALOG_PRODUCT_GRID_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'selection', width: '46px', header: '', cellTemplate: { slot: 'cell1' } },
  {
    field: 'offer_id',
    width: '150px',
    header: 'Артикул',
    styleClass: 'offer-cell',
    cellTemplate: { slot: 'cell2' },
  },
  {
    field: 'name',
    width: '320px',
    header: 'Номенклатура',
    styleClass: 'name-cell',
    cellTemplate: { slot: 'cell3' },
  },
  {
    field: 'category_name',
    width: '200px',
    header: 'Категория маркетплейса',
    cellTemplate: { slot: 'cell4' },
  },
  {
    field: 'type_name',
    width: '180px',
    header: 'Тип маркетплейса',
    cellTemplate: { slot: 'cell5' },
  },
  {
    field: 'report_category',
    width: '160px',
    header: 'FIN-категория',
    cellTemplate: { slot: 'cell6' },
  },
  { field: 'report_type', width: '160px', header: 'FIN-тип', cellTemplate: { slot: 'cell7' } },
  {
    field: 'fixed_margin',
    width: '150px',
    header: 'Целевая маржа, %',
    cellTemplate: { slot: 'cell8' },
  },
  { field: 'units_sold', width: '140px', header: 'Доставлено', cellTemplate: { slot: 'cell9' } },
  { field: 'price', width: '130px', header: 'Цена, ₽', cellTemplate: { slot: 'cell10' } },
  {
    field: 'package_cost',
    width: '180px',
    header: 'Себес × квант',
    cellTemplate: { slot: 'cell11' },
  },
  {
    field: 'promotion_model_title',
    width: '210px',
    header: 'Модель акций',
    cellTemplate: { slot: 'cell12' },
  },
  {
    field: 'actions',
    width: '180px',
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

export const CATALOG_PRODUCT_GRID_TABLE_STYLE = {
  width: `${CATALOG_PRODUCT_GRID_TABLE_COLUMNS1.reduce((total, column) => total + Number.parseInt(column.width || '0', 10), 0)}px`,
  minWidth: '100%',
  tableLayout: 'fixed',
};
