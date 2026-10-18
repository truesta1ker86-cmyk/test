import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const PROFIT_SUMMARY_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: '', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Расшифровка', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: '', styleClass: 'product', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: '', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: '', cellTemplate: { slot: 'cell6' } },
  { field: 'column_7', header: '', cellTemplate: { slot: 'cell7' } },
  { field: 'column_8', header: '', cellTemplate: { slot: 'cell8' } },
  { field: 'column_9', header: '', cellTemplate: { slot: 'cell9' } },
  { field: 'column_10', header: '', cellTemplate: { slot: 'cell10' } },
  { field: 'column_11', header: '', cellTemplate: { slot: 'cell11' } },
  { field: 'column_12', header: '', cellTemplate: { slot: 'cell12' } },
];

export const PROFIT_SUMMARY_COLUMNS = [
  ['report_category', 'Категория'],
  ['report_type', 'Тип'],
  ['product_name', 'Номенклатура / артикул'],
  ['units_sold', 'Продано'],
  ['revenue', 'Продажи и возвраты'],
  ['ozon_accrual', 'Итого маркетплейса'],
  ['cost', 'Себестоимость'],
  ['gross_profit', 'Валовая прибыль'],
  ['tax', 'Налог'],
  ['profit', 'Чистая прибыль'],
  ['margin_pct', 'Маржа'],
];
