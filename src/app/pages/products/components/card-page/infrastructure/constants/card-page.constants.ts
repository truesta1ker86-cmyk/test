import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const CARD_PAGE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Поле', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Снимок', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Черновик', cellTemplate: { slot: 'cell3' } },
];

export const CARD_PAGE_TABS = [
  { id: 'onec', name: 'Товар из 1С' },
  { id: 'image', name: 'Изображение' },
  { id: 'content', name: 'Номенклатура и описание' },
  { id: 'attributes', name: 'Характеристики' },
  { id: 'review', name: 'Проверка' },
];

export const CARD_PAGE_DIMENSIONS = [
  { key: 'weight', name: 'Вес упаковки, кг', step: 'any' },
  { key: 'length', name: 'Длина, мм', step: '1' },
  { key: 'width', name: 'Ширина, мм', step: '1' },
  { key: 'height', name: 'Высота, мм', step: '1' },
];
