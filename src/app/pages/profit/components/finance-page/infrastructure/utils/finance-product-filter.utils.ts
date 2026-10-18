import type { FinanceProductFilter } from '../interfaces/finance-product-filter.interfaces';
import type { Entry } from '../types/finance-page.types';

const normalized = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('ru')
    .replaceAll('ё', 'е');

export function financeProductMatches(
  row: Entry,
  filter: FinanceProductFilter,
  skip: Set<string>,
): boolean {
  for (const key of ['category', 'product_type', 'product'] as const) {
    const actual = row[key === 'product' ? 'offer_id' : key];
    if (!skip.has(key) && filter[key] && actual !== filter[key]) return false;
  }
  if (filter.article && !normalized(row['offer_id']).includes(normalized(filter.article)))
    return false;
  const searchable = [
    'offer_id',
    'name',
    'category',
    'product_type',
    'brand',
    'series',
    'color',
    'product_group',
    'fin_type',
  ]
    .map((key) => row[key] ?? '')
    .join(' ');
  if (
    normalized(filter.q)
      .split(/\s+/)
      .filter(Boolean)
      .some((term) => !normalized(searchable).includes(term))
  )
    return false;
  try {
    const facets: unknown = JSON.parse(filter.facets || '{}');
    if (!facets || typeof facets !== 'object' || Array.isArray(facets)) return false;
    return Object.entries(facets).every(
      ([key, values]) =>
        Array.isArray(values) &&
        (skip.has(key) || !values.length || values.includes(String(row[key] ?? '') || '__empty__')),
    );
  } catch {
    return false;
  }
}

export function financeProductOptions(rows: Entry[], filter: FinanceProductFilter, field: string) {
  const skip =
    field === 'category'
      ? new Set(['category', 'product_type', 'product'])
      : field === 'product_type'
        ? new Set(['product_type', 'product'])
        : new Set([field]);
  const found = rows.filter((row) => financeProductMatches(row, filter, skip));
  const counts = new Map<string, number>();
  for (const row of found) {
    const value = String(row[field === 'product' ? 'offer_id' : field] ?? '') || '__empty__';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b, 'ru', { numeric: true }))
    .map(([value, count]) => ({
      value,
      count,
      label:
        field === 'product'
          ? String(found.find((row) => row['offer_id'] === value)?.['name']) + ' · ' + value
          : value === '__empty__'
            ? '(Пусто / нет данных)'
            : value,
    }));
}
