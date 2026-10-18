import { PricingQuery } from '../interfaces/pricing-query.interfaces';
import { pricingScopeFilters } from './pricing-query.utils';
import { Scope } from '../interfaces/editor-contracts.interfaces';

export function filterScope(query: PricingQuery): Scope {
  return { filters: pricingScopeFilters(query) };
}
