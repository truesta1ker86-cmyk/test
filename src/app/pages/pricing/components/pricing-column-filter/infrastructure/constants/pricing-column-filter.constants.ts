import type { PriceColumnFilter } from '../interfaces/pricing-column-filter.interfaces';
export const PRICING_COLUMN_DEFAULT: PriceColumnFilter = {
  values: [],
  text: '',
  operator: 'contains',
  min: '',
  max: '',
};
export const PRICING_COLUMN_OPERATORS = [
  { value: 'contains', label: 'Содержит' },
  { value: 'not_contains', label: 'Не содержит' },
];
