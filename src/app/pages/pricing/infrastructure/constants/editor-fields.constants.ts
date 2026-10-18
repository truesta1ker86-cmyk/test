import { EditorField } from '../interfaces/editor-fields.interfaces';

export const editorFields: EditorField[] = [
  { key: 'fin_type', label: 'Тип Фин', kind: 'text', nullable: true },
  { key: 'ozon_type', label: 'Тип Ozon', kind: 'text', nullable: true },
  { key: 'plan_ship_method', label: 'Схема плана минималки', kind: 'scheme', nullable: true },
  { key: 'ship_method', label: 'Схема API для фактической маржи', kind: 'scheme', nullable: true },
  { key: 'manual_cost', label: 'Ручная себестоимость, ₽', kind: 'number', nullable: true },
  { key: 'volume', label: 'Объём, л', kind: 'number', nullable: true },
  { key: 'units_per_item', label: 'Единиц в товаре', kind: 'integer', nullable: false },
  { key: 'fixed_margin', label: 'Ручная целевая маржа, %', kind: 'rate', nullable: true },
  { key: 'excel_advertising_rate', label: 'Реклама по Excel, %', kind: 'rate', nullable: true },
  { key: 'brand_promotion_rate', label: 'Продвижение бренда, %', kind: 'rate', nullable: true },
  {
    key: 'promotion_adjustment_rate',
    label: 'Корректировка участия, %',
    kind: 'rate',
    nullable: true,
  },
  { key: 'sku_1c', label: 'Артикул 1С', kind: 'text', nullable: true },
  { key: 'locked', label: 'Защита от массовых правок', kind: 'boolean', nullable: false },
];
