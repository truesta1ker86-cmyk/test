import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const RETURN_SORTS = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'amount_desc', label: 'Сначала дорогие' },
];

export const RETURN_COLUMNS: DataTableColumn[] = [
  { field: 'posting_number', header: 'Номер', cellTemplate: { slot: 'posting' } },
  { field: 'offer_id', header: 'Артикул', cellTemplate: { slot: 'offer' } },
  {
    field: 'amount',
    header: 'Сумма возврата',
    styleClass: 'numeric',
    cellTemplate: { slot: 'amount' },
  },
  { field: 'date', header: 'Дата возврата', cellTemplate: { slot: 'date' } },
  { field: 'status', header: 'Статус', cellTemplate: { slot: 'status' } },
];
