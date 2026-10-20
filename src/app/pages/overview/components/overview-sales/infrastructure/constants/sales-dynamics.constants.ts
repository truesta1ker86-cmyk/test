export const SALES_PERIODS = [
  { days: 7, label: '7 дней' },
  { days: 14, label: '14 дней' },
  { days: 30, label: '30 дней' },
];
export const SALES_DEFAULT_PERIOD = 30;
export const SALES_COLORS = {
  line: '#005bff',
  fill: 'rgba(0, 91, 255, 0.08)',
  grid: 'rgba(16, 24, 40, 0.06)',
  text: '#667085',
};
import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const SALES_DAY_COLUMNS: DataTableColumn[] = [
  { field: 'date', header: 'Дата', cellTemplate: { slot: 'date' } },
  {
    field: 'units',
    header: 'Доставлено, шт.',
    styleClass: 'numeric',
    cellTemplate: { slot: 'units' },
  },
  {
    field: 'revenue',
    header: 'Выручка доставок',
    styleClass: 'numeric',
    cellTemplate: { slot: 'revenue' },
  },
];
