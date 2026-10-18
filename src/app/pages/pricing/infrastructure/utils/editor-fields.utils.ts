import { shareToPercentage } from '../../../stocks/infrastructure/utils/matrix-state.utils';
import { EditorField } from '../interfaces/editor-fields.interfaces';

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
