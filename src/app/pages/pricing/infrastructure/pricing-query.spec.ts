import { parsePricingQuery, queryParams } from './utils/pricing-query.utils';
import { filterScope } from './utils/editor-contracts.utils';

describe('Pricing URL filters', () => {
  it('keeps the not-below-minimum filter for both the table and bulk operations', () => {
    const query = parsePricingQuery({ promo_below_minimum: 'false', page_size: '500' });
    expect(query.promo_below_minimum, parsePricingQuery.toString()).toBe('false');
    expect(queryParams(query)['promo_below_minimum']).toBe('false');
    expect(filterScope(query).filters?.['promo_below_minimum']).toBe(false);
    expect(query.page_size).toBe(500);
  });
  it('restores search and a shipping filter after reloading a deep link', () => {
    const query = parsePricingQuery({ search: '  АРТ-1  ', ship_method: 'fbs', page: '3' });
    expect(query.search).toBe('АРТ-1');
    expect(query.ship_method).toBe('fbs');
    expect(query.page).toBe(3);
  });

  it('normalizes invalid pagination and unsupported sort fields', () => {
    const query = parsePricingQuery({ page: '-3', page_size: '9999', sort_by: 'tenant_id' });
    expect(query.page).toBe(1);
    expect(query.page_size).toBe(250);
    expect(query.sort_by).toBe('offer_id');
  });

  it('passes the below-minimum comparison as a boolean filter, without imposing a floor', () => {
    const query = parsePricingQuery({ promo_below_minimum: 'true' });
    expect(query.promo_below_minimum).toBe('true');
    expect(queryParams(query)['promo_below_minimum']).toBe('true');
  });

  it('preserves a financial type with special characters in the URL state', () => {
    const query = parsePricingQuery({ fin_type: 'Кабель / 2+1', sort_direction: 'desc' });
    expect(queryParams(query)['fin_type']).toBe('Кабель / 2+1');
    expect(query.sort_direction).toBe('desc');
  });
});

describe('Pricing shared full-data filters', () => {
  it('keeps column ranges, multiple choices, result tab and conditions in bulk scope', () => {
    const raw = {
      fin_type: '["Водосток","Крепёж"]',
      results: 'failed',
      column_filters:
        '{"actual_cost":{"values":[],"min":"100","max":"500","text":"","operator":"contains"}}',
      conditions: '[{"field":"fixed_margin","operator":"gt","value":"10"}]',
      logic: 'all',
    };
    const q = parsePricingQuery(raw),
      scope = filterScope(q).filters!;
    expect(scope['column_filters']).toBe(raw.column_filters);
    expect(scope['fin_type']).toBe(raw.fin_type);
    expect(scope['conditions']).toBe(raw.conditions);
    expect(scope['results']).toBe('failed');
    expect(queryParams(q)['column_filters']).toBe(raw.column_filters);
  });
});
