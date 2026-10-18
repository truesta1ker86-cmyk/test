import { PriceColumnFilter } from '../interfaces/pricing-column-filter.interfaces';

export function priceColumns(raw: string): Record<string, PriceColumnFilter> {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}
