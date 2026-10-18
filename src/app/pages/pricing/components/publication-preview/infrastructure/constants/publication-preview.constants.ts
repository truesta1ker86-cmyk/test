import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const PRICING_PUBLICATION_PREVIEW_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Товар', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Сейчас', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Цена', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Минималка', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'До скидки', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Результат', cellTemplate: { slot: 'cell6' } },
];

export const PRICING_PUBLICATION_PREVIEW_LABELS: Record<string, string> = {
  ready: 'Готово к отправке',
  blocked: 'Нужны данные',
  unchanged: 'Уже совпадает',
};
