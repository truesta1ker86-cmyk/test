export interface EditorField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'integer' | 'rate' | 'scheme' | 'boolean';
  nullable: boolean;
}
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

export function editorValue(field: EditorField, raw: string): string | number | boolean | null {
  const value = raw.trim();
  if (!value) {
    if (field.nullable) return null;
    throw new Error(`Заполните «${field.label}».`);
  }
  if (field.kind === 'text' || field.kind === 'scheme') return value;
  if (field.kind === 'boolean') {
    if (value !== 'true' && value !== 'false') throw new Error(`Выберите «${field.label}».`);
    return value === 'true';
  }
  const normalized = value.replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new Error(`Проверьте «${field.label}».`);
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error(`Проверьте «${field.label}».`);
  if (field.kind === 'integer') {
    if (!Number.isSafeInteger(number) || number < 1)
      throw new Error('Количество должно быть целым и не меньше 1.');
    return number;
  }
  if (field.kind !== 'rate') return normalized;
  const negative = normalized.startsWith('-');
  const [whole, fraction = ''] = (negative ? normalized.slice(1) : normalized).split('.');
  const integer = (whole.slice(0, -2) || '0').replace(/^0+(?=\d)/, '');
  const digits = (whole.slice(-2).padStart(2, '0') + fraction).replace(/0+$/, '');
  return `${negative ? '-' : ''}${integer}${digits ? '.' + digits : ''}`;
}

export function displayInput(field: EditorField, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (field.kind === 'scheme') return String(value).toUpperCase();
  if (field.kind === 'rate') {
    const raw = String(value);
    return raw.startsWith('-') ? '-' + shareToPercentage(raw.slice(1)) : shareToPercentage(raw);
  }
  return String(value);
}
import { shareToPercentage } from '../stocks/matrix-state';
