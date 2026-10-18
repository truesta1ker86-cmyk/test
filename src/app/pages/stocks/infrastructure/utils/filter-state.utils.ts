import { stockFilterKeys } from '../constants/filter-state.constants';
import { StockQuery, StockView } from '../types/filter-state.types';

export function emptyStockView(): StockView {
  return {
    q: '',
    article: '',
    name: '',
    article_operator: 'contains',
    name_operator: 'contains',
    filters: Object.fromEntries(stockFilterKeys.map((key) => [key, []])),
    sort: 'offer_id',
    direction: 'asc',
    page: 1,
    page_size: 100,
  };
}

export function stockValues(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string'))
      return parsed.filter(Boolean);
  } catch {}
  return [raw];
}

export function stockParams(query: StockQuery) {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      Array.isArray(value) ? JSON.stringify(value) : value,
    ]),
  );
}

export function readStockView(params: Record<string, string | null>, saved?: StockView): StockView {
  const state = emptyStockView();
  if (saved && !Object.keys(params).some((key) => key !== 'tab')) return structuredClone(saved);
  for (const key of stockFilterKeys) state.filters[key] = stockValues(params[key]);
  for (const key of [
    'q',
    'article',
    'name',
    'article_operator',
    'name_operator',
    'sort',
    'direction',
  ] as const)
    if (params[key]) state[key] = params[key]!;
  const page = Number(params['page']),
    size = Number(params['page_size']);
  state.page = Number.isSafeInteger(page) && page > 0 ? page : 1;
  state.page_size = [50, 100, 200, 500].includes(size) ? size : 100;
  return state;
}

export function stockViewQuery(state: StockView): StockQuery {
  return {
    ...state.filters,
    q: state.q,
    article: state.article,
    name: state.name,
    article_operator: state.article_operator,
    name_operator: state.name_operator,
    sort: state.sort,
    direction: state.direction,
    page: state.page,
    page_size: state.page_size,
  };
}

export function stockRouteQuery(state: StockView, tab: string) {
  return {
    tab,
    ...Object.fromEntries(
      Object.entries(stockParams(stockViewQuery(state))).map(([key, value]) => [
        key,
        value === '' || value === '[]' ? null : value,
      ]),
    ),
  };
}
