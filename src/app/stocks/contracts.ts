export interface Rule {
  id?: number;
  offer_id: string;
  warehouse_id: string | null;
  target_qty: number | null;
  maintain_target: boolean;
  share: string | number | null;
  quantum: number;
  enabled: boolean;
  version?: string;
  last_pushed_qty?: number | null;
  last_applied_at?: string | null;
}
export type WarehouseDefaults = { fixed: boolean; value: string; quantum: string };
export interface StockRunPreview {
  dry_run: boolean;
  sends_enabled: boolean;
  pushed: number;
  products: number;
  rules: number;
  ready: number;
  blocked: number;
  without_rules: number;
  rules_signature: string;
  items: {
    offer_id: string;
    name: string | null;
    warehouse_id: string | null;
    qty: number | null;
    current_ozon_qty: number | null;
    source: string;
    protected_fbs_orders: number;
    status: string;
  }[];
}
export interface StockFact {
  sku?: number | string;
  mapping_status?: string;
  mapping_verified?: boolean;
  offer_id: string;
  product_name: string | null;
  main_image?: string | null;
  category?: string | null;
  type?: string | null;
  onec_code?: string | null;
  rules_count?: number;
  distributed?: boolean;
  has_mapping?: boolean;
  reserved_1c_base?: number;
  active_fbs_orders?: number;
  protected_fbs_orders?: number;
  ambiguous_fbs_orders?: number;
  matrix_physical_base?: number | null;
  matrix_physical?: number | null;
  ozon_by_warehouse?: Record<string, number>;
  sku_1c: string | null;
  units_per_item: number | null;
  physical_1c: number | null;
  physical_1c_base: number | null;
  reserved_1c: number | null;
  calculated_publishable: number | null;
  safe_publishable: number | null;
  ozon_fbs_available: number | null;
  ozon_fbs_reserved: number | null;
  difference: number | null;
  status: string;
  one_c_measured_at: string | null;
  ozon_updated_at: string | null;
}
export interface RawStock {
  product_name?: string | null;
  main_image?: string | null;
  source: string;
  sku: number | null;
  sku_1c: string | null;
  offer_id: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  available: number;
  reserved: number;
  measured_at: string | null;
  updated_at: string | null;
}
export interface StockPage<T> {
  items: T[];
  meta?: { total: number; page: number; page_size: number; has_more: boolean };
  total?: number;
  has_more?: boolean;
  summary?: Record<string, number>;
  snapshot_at?: string;
  facets?: Record<string, string[]>;
}
export interface StockContext {
  local_preview?: boolean;
  fact_sync?: {
    status: string;
    copied_at: string | null;
    source_snapshot_at: string | null;
  } | null;
  stock_warehouses?: { warehouse_id: string; warehouse_name: string | null; source: string }[];
  expected_physical_by_offer?: Record<string, number>;
  onec_warehouses: {
    warehouse_id: string;
    warehouse_name: string | null;
    product_count: number;
    available: number;
    reserved: number;
  }[];
  ozon_warehouses: StockWarehouse[];
  warehouse_catalog_loaded?: boolean;
  warehouse_snapshot_ids?: string[];
  rules: Rule[];
}
export interface StockWarehouse {
  warehouse_id: string;
  warehouse_name: string;
  status?: string | null;
  is_rfbs?: boolean;
  available?: boolean;
}
export interface MatrixCell {
  offer_id: string;
  warehouse_id: string;
  target_qty: number | null;
  maintain_target: boolean;
  share: string | number | null;
  quantum: number;
  enabled: boolean;
}
export interface MatrixPreview {
  physical_distribution_ready: boolean;
  missing_inventory_products: number;
  operation_id: string;
  rules: number;
  creates: number;
  updates: number;
  requires_fake_confirmation: boolean;
  inventory: {
    offer_id: string;
    available_1c: number | null;
    distributed_qty: number;
    fake_target_qty: number;
    unallocated_qty: number | null;
  }[];
  sample: {
    offer_id: string;
    name: string | null;
    warehouse_id: string;
    available_1c: number | null;
    calculated_qty: number | null;
    before: Rule | null;
    after: Rule;
  }[];
}
export interface StockOperation {
  operation_id: string;
  kind: string;
  status: string;
  created_at: string;
  result: { applied?: number; undone?: number; conflicts?: number } | null;
}
export interface ExpectedPlan {
  main_image?: string | null;
  offer_id: string;
  name: string | null;
  expected_qty: number;
  arrival_date: string;
  status: string;
  physical_qty_1c: number;
}
export interface ExpectedPreview {
  operation_id: string;
  arrival_date: string;
  products: number;
  expected_qty: number;
  distributed_qty: number;
  unallocated_qty: number;
  items: {
    main_image?: string | null;
    offer_id: string;
    name: string | null;
    expected_qty: number;
    distributed_qty: number;
    unallocated_qty: number;
    allocations: { warehouse_id: string; qty: number }[];
  }[];
}
