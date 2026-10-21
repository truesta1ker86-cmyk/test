import { PriceColumnFilter } from '../interfaces/pricing-column-filter.interfaces';

export function priceColumns(raw: string): Record<string, PriceColumnFilter> {
  try {
    const value = JSON.parse(raw || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
