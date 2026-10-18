import { SortColumn } from '../types/pricing-query.types';

export interface PricingQuery {
  column_filters: string;
  search: string;
  article: string;
  name: string;
  category: string;
  ozon_type: string;
  report_category: string;
  report_type: string;
  fin_type: string;
  product_group: string;
  brand: string;
  series: string;
  length_mm: string;
  color: string;
  units_per_item: string;
  plan_ship_method: string;
  ship_method: string;
  margin_min: string;
  margin_max: string;
  promo_below_minimum: string;
  conditions: string;
  logic: string;
  results: string;
  page: number;
  page_size: number;
  sort_by: SortColumn;
  sort_direction: 'asc' | 'desc';
}
