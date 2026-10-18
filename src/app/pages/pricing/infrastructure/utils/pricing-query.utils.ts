import { sortColumns, pricingFacetFields } from '../constants/pricing-query.constants';
import { SortColumn } from '../types/pricing-query.types';
import { PricingQuery } from '../interfaces/pricing-query.interfaces';

export function parsePricingQuery(raw: Record<string, string>): PricingQuery {
  const page = Number(raw['page']),
    size = Number(raw['page_size']);
  const fields = Object.fromEntries(
    pricingFacetFields.map(([k]) => [k, (raw[k] || '').slice(0, 10000)]),
  );
  const ship = raw['ship_method'] || '';
  fields['ship_method'] =
    ship.startsWith('[') || ['fbs', 'fbo', 'rfbs'].includes(ship.toLowerCase()) ? ship : '';
  return {
    column_filters: raw['column_filters'] || '',
    ...fields,
    search: (raw['search'] || '').trim().slice(0, 200),
    article: raw['article'] || '',
    name: raw['name'] || '',
    margin_min: raw['margin_min'] || '',
    margin_max: raw['margin_max'] || '',
    promo_below_minimum: ['true', 'false'].includes(raw['promo_below_minimum'])
      ? raw['promo_below_minimum']
      : '',
    conditions: raw['conditions'] || '',
    logic: raw['logic'] === 'any' ? 'any' : 'all',
    results: raw['results'] === 'failed' ? 'failed' : 'all',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    page_size: [25, 50, 100, 200, 250, 500].includes(size) ? size : 250,
    sort_by: sortColumns.includes(raw['sort_by'] as SortColumn)
      ? (raw['sort_by'] as SortColumn)
      : 'offer_id',
    sort_direction: raw['sort_direction'] === 'desc' ? 'desc' : 'asc',
  } as PricingQuery;
}

export function queryParams(query: PricingQuery): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== '' && v !== '[]')
      .map(([k, v]) => [k, String(v)]),
  );
}

export function facetValues(value: string): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
  } catch {}
  return [value];
}

export function pricingScopeFilters(query: PricingQuery): Record<string, unknown> {
  const { page, page_size, sort_by, sort_direction, ...values } = query;
  const filters: Record<string, unknown> = { ...values };
  if (query.search) {
    filters['product_query'] = query.search;
    delete filters['search'];
  }
  if (query.ship_method) filters['ship_method'] = query.ship_method.toUpperCase();
  if (query.promo_below_minimum)
    filters['promo_below_minimum'] = query.promo_below_minimum === 'true';
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
}
