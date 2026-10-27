import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const OVERVIEW_ONEC_STATES: Record<string, { label: string; tone: string }> = {
  ready: { label: 'Снимок 1С актуален', tone: 'ready' },
  stale: { label: 'Снимок 1С устарел', tone: 'warning' },
  error: { label: 'Ошибка обмена с 1С', tone: 'error' },
  awaiting_snapshot: { label: 'Ожидаем снимок 1С', tone: 'muted' },
  waiting: { label: 'Ожидаем загрузку из 1С', tone: 'muted' },
  not_configured: { label: 'Подключение 1С не настроено', tone: 'muted' },
};

export const OVERVIEW_PAGE_TABLE_COLUMNS2: DataTableColumn[] = [
  { field: 'column_1', header: 'Дата и время', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Операция', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Тип данных', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Результат', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Комментарий', cellTemplate: { slot: 'cell5' } },
];
