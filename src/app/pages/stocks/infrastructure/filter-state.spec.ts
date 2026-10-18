import {
  emptyStockView,
  readStockView,
  stockParams,
  stockRouteQuery,
  stockViewQuery,
} from './utils/filter-state.utils';

describe('Stock filter and page state', () => {
  it('round-trips multiple independent selections in one query value', () => {
    const state = emptyStockView();
    state.filters['brand'] = ['Docke', 'Grand Line'];
    state.filters['category'] = ['А', 'Б'];
    state.article = 'A-001';
    state.article_operator = 'not_contains';
    state.page_size = 500;
    const route = stockRouteQuery(state, 'matrix');
    const parsed = readStockView(
      Object.fromEntries(
        Object.entries(route).map(([key, value]) => [key, value === null ? null : String(value)]),
      ),
    );
    expect(parsed).toEqual(state);
    expect(stockParams(stockViewQuery(parsed))['brand']).toBe('["Docke","Grand Line"]');
  });
  it('keeps view-specific state when returning through navigation but explicit links start from their own filters', () => {
    const saved = emptyStockView();
    saved.filters['brand'] = ['Docke'];
    saved.page = 3;
    expect(readStockView({ tab: 'matrix' }, saved)).toEqual(saved);
    expect(readStockView({ tab: 'matrix', article: 'OTHER' }, saved).filters['brand']).toEqual([]);
  });
  it('supports legacy scalar filters and resets invalid page sizes', () => {
    const state = readStockView({ brand: 'Docke', page: '-1', page_size: '999' });
    expect(state.filters['brand']).toEqual(['Docke']);
    expect(state.page).toBe(1);
    expect(state.page_size).toBe(100);
  });
});
