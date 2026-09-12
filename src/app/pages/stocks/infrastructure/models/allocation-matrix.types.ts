import { Entity, FilterSchema } from "../../../../shared/filtering/filter.types";
import { CombinedFilters } from "./filter.interface";
import { Stock } from "./stock.model";


export interface ProductEntity extends Entity {
  offer_id?: string;
  name?: string;
  category_label?: string;
  type_label?: string;
  brand?: string;
  filter_group?: string;
  filter_series?: string;
  filter_length_mm?: string | number;
  filter_color?: string;
  filter_package_qty?: string | number;
  units_per_item?: number;
  sku_1c?: string;
}


export interface Warehouse {
  warehouse_id: string;
  warehouse_name?: string;
  is_rfbs?: boolean;
}


export interface DraftCell {
  mode: 'share' | 'target';
  value: number;
  quantum: number;
}


export interface RuleState {
  mode: 'share' | 'target';
  value: number;
  quantum: number;
  enabled: boolean;
  dirty: boolean;
}


export type DraftField = 'mode' | 'value' | 'quantum';


export interface DraftChangeEvent {
  field: DraftField;
  newValue: unknown;
}


export const EMPTY_FILTERS: CombinedFilters = {
  category: '',
  type: '',
  brand: '',
  group: '',
  series: '',
  length: '',
  color: '',
  package: '',
  searchOffer: '',
  searchName: '',
};


export interface AllocationMatrixInputs {
  products: ProductEntity[];
  warehouses: Warehouse[];
  selectedWarehouses: string[];
  stocks: Stock[];
  rows: number;
}

export const PRODUCT_FILTER_SCHEMA: FilterSchema<ProductEntity> = {
    category: { path: 'category_label', mode: 'equals' },
    type:     { path: 'type_label',     mode: 'equals' },
    brand:    { path: 'brand',          mode: 'equals' },
    group:    { path: 'filter_group',   mode: 'equals' },
    series:   { path: 'filter_series',  mode: 'equals' },
    color:    { path: 'filter_color',   mode: 'equals' },
  
    length: {
      path: 'filter_length_mm',
      mode: 'equals',
      transform: v => (v == null ? '' : String(v)),
    },
    package: {
      path: 'filter_package_qty',
      mode: 'equals',
      transform: v => (v == null ? '' : String(v)),
    },
  
    searchOffer: {
      path: 'offer_id',
      mode: 'includes',
      filterTransform: v => v.replace(/\s+/g, '').toLowerCase(),
    },
  
    searchName: {
      path: 'name',
      mode: 'includes',
      extraPaths: ['offer_id'],
    },
  };


export type CellKey = `${string}|${string}`;

export function cellKey(offerId: string | undefined, warehouseId: string): CellKey {
  return `${offerId ?? ''}|${warehouseId}`;
}