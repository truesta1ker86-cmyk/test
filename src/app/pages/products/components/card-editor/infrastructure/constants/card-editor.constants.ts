export const CARD_EDITOR_FIELDS = [
  { key: 'name', label: 'Название', type: 'text', max: 500 },
  { key: 'barcode', label: 'Штрихкод', type: 'text', max: 100 },
  { key: 'weight', label: 'Вес упаковки, кг', type: 'number', max: 1000000 },
  { key: 'length', label: 'Длина, мм', type: 'number', max: 1000000 },
  { key: 'width', label: 'Ширина, мм', type: 'number', max: 1000000 },
  { key: 'height', label: 'Высота, мм', type: 'number', max: 1000000 },
] as const;
