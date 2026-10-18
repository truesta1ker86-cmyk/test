import { date } from '../../../../../../core/infrastructure/utils/format.utils';
import { Entry } from '../types/finance-page.types';

export const array = (value: unknown): Entry[] => (Array.isArray(value) ? value : []);

export const object = (value: unknown): Entry =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Entry) : {};

export const text = (value: unknown) =>
  value === null || value === undefined ? '' : String(value);

export const amount = (value: unknown): string | number | null =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

export const calendarDate = (value: unknown) => {
  const day = text(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.split('-').reverse().join('.') : day;
};

export function validFinanceDates(start: string, end: string) {
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T00:00:00Z')) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  return valid(start) && valid(end) && start <= end;
}

export function monthLabel(month: Record<string, unknown>) {
  const key = String(month['key'] || '');
  const date = new Date(key + '-01T12:00:00Z');
  return Number.isNaN(date.getTime())
    ? key
    : new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        date,
      );
}
