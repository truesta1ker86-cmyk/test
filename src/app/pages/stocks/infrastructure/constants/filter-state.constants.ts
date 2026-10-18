export const stockFacetFields = [
  ['category', 'Категория маркетплейса'],
  ['type', 'Тип маркетплейса'],
  ['report_category', 'Категория в отчёте'],
  ['report_type', 'Тип в отчёте'],
  ['fin_type', 'Тип Фин'],
  ['product_group', 'Подгруппа'],
  ['brand', 'Бренд'],
  ['series', 'Серия'],
  ['length_mm', 'Длина, мм'],
  ['color', 'Цвет'],
  ['package_qty', 'Упаковка'],
] as const;

export const stockFilterKeys = [
  ...stockFacetFields.map((field) => field[0]),
  'mapping_status',
  'rules_status',
  'distribution_status',
  'status',
  'source',
];
