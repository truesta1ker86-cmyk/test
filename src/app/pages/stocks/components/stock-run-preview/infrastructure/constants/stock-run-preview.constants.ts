import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const STOCK_RUN_PANEL_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Товар', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Склад', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Сейчас в Ozon', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'К показу', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Источник расчёта', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Заказы после снимка', cellTemplate: { slot: 'cell6' } },
];

export const STOCK_RUN_PANEL_SOURCES: Record<string, string> = {
  physical_1c: 'Остаток 1С после защиты заказами',
  expected_receipt: 'Ожидаемая поставка',
  expected_receipt_expired: 'Срок ожидаемой поставки истёк',
  legacy_target: 'Фиксированное количество',
  matrix_disabled: 'Нулевое выключенное правило',
};
