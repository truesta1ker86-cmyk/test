import { Amount } from '../types/contracts.types';

export function number(value: Amount | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

export function money(value: Amount | undefined): string {
  const amount = number(value);
  return amount === null
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
      }).format(amount);
}

export function percent(value: Amount | undefined): string {
  const amount = number(value);
  return amount === null
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(amount);
}

export function date(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(
    value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z',
  );
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(parsed);
}

export function source(value: string | null | undefined): string {
  const names: Record<string, string> = {
    none: 'Источник не найден',
    excel_reference: 'Плановый справочник',
    marketplace_api_plan_fallback: 'API Ozon · резерв для плана',
    batch: 'Партия 1С',
    purchase: 'Закупочная цена',
    dealer: 'Дилерская цена',
    manual: 'Вручную',
    report: 'Отчёт',
    marketplace_api: 'API Ozon',
    formula: 'Формула',
    product: 'Настройка товара',
    fin_type: 'Тип Фин',
    excel_fin_type: 'Excel · тип Фин',
    ozon_type: 'Тип Ozon',
    ozon_category: 'Категория Ozon',
    plan: 'План',
  };
  return value ? names[value] || value : 'Источник не указан';
}
