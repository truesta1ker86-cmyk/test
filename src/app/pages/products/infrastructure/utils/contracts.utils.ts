import { CatalogMode } from '../types/contracts.types';
import { CatalogQuery } from '../interfaces/contracts.interfaces';

export function defaultQuery(mode: CatalogMode): CatalogQuery {
  return {
    mode,
    days: 30,
    page: 1,
    page_size: 50,
    q: '',
    name_search: '',
    mapping_reason: '',
    articles: '',
    exclude_articles: false,
    category: '',
    type: '',
    brand: '',
    fin_type: '',
    report_category: '',
    report_type: '',
    product_group: '',
    series: '',
    color: '',
    length_mm: '',
    package_qty: '',
    units_per_item: '',
    state: '',
    mapping_status: '',
    cost_mode: '',
    sort: 'offer_id',
    direction: 'asc',
    rules: '',
    column_filters: '{}',
  };
}
