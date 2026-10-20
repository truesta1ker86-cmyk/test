import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const PROMOTIONS_PAGE_TABLE_COLUMNS4: DataTableColumn[] = [
  { field: 'column_1', header: 'Дата', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Область', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Модель', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Строк', styleClass: 'numeric', cellTemplate: { slot: 'cell4' } },
  { field: 'column_5', header: 'Состояние', cellTemplate: { slot: 'cell5' } },
  { field: 'column_6', header: 'Действия', cellTemplate: { slot: 'cell6' } },
];

export const PROMOTIONS_PAGE_TABLE_COLUMNS3: DataTableColumn[] = [
  { field: 'column_1', header: 'Строка', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'До', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'После', cellTemplate: { slot: 'cell3' } },
];

export const PROMOTIONS_PAGE_DECISIONS: Record<string, string> = {
  unchanged: 'Без изменений',
  add: 'Добавить в акцию',
  update: 'Изменить цену',
  remove: 'Убрать из акции',
  skip: 'Не участвовать',
  protected: 'Защищён',
  incomplete: 'Не хватает данных',
  unmanaged: 'Без модели',
};
export const PROMOTIONS_PAGE_SIZE = 50;
