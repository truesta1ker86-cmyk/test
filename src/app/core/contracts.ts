export interface SellerSession {
  data_mode?: 'sandbox_db';
  snapshot_at?: string;
  external_integrations_enabled?: boolean;
  session_scope?: 'v2';
  tenant_id: number;
  name: string;
  actor_name: string;
  role: string;
  is_owner: boolean;
  expires_in_seconds: number;
}

export type Amount = number | string | null;
export interface PricingRow {
  main_image?: string | null;
  version?: string;
  ozon_type?: string | null;
  volume?: Amount;
  units_per_item?: number;
  calculated_old_price?: Amount;
  excel_advertising_rate?: Amount;
  brand_promotion_rate?: Amount;
  promotion_adjustment_rate?: Amount;
  advertising_active?: boolean;
  advertising_expense?: Amount;
  advertising_expense_rate?: Amount;
  formula_revision?: number;
  locked?: boolean;
  manual_cost?: Amount;
  fixed_margin?: Amount;
  trace?: Calculation['trace'];
  [key: string]: unknown;
  actual_cost?: Amount;
  actual_cost_at?: string | null;
  actual_buyer_margin_min?: Amount;
  marketplace_expense_base_price?: Amount;
  current_commission?: Amount;
  current_marketplace_min_price?: Amount;
  offer_id: string;
  name: string | null;
  fin_type: string | null;
  onec_code: string | null;
  plan_ship_method: string | null;
  readiness_status: 'ready' | 'blocked' | 'inactive';
  blocking_errors: string[];
  effective_cost: Amount;
  effective_cost_source: string | null;
  effective_margin: Amount;
  effective_margin_source: string | null;
  effective_commission: Amount;
  effective_logistics: Amount;
  effective_logistics_min: Amount;
  effective_logistics_max: Amount;
  effective_logistics_source: string | null;
  calculated_price: Amount;
  calculated_min_price: Amount;
  working_min_price: Amount;
  working_min_price_source: string | null;
  formula_min_price: Amount;
  current_seller_price: Amount;
  current_buyer_price: Amount;
  current_buyer_price_source: string | null;
  actual_buyer_margin: Amount;
  actual_shipping_scheme: string | null;
  promo_below_calculated_min: boolean;
  updated_at: string | null;
}

export interface PricingPage {
  items: PricingRow[];
  total: number;
  page: number;
  page_size: number;
  ready_on_page: number;
  blocked_on_page: number;
  inactive_on_page: number;
  uncalculated_total: number;
}

export interface PricingRefs {
  fin_margin_groups?: { report_type: string; label: string }[];
  facets?: Record<string, string[]>;
  default_expressions?: { min_price: string; price: string; old_price: string };
  filter_fin_types: string[];
  catalog_filters?: {
    description_category_id: number;
    type_id: number;
    category_label: string;
    type_label: string;
  }[];
}
export interface Formula {
  revision: number;
  updated_at: string | null;
  price_divisor: number;
  old_price_divisor: number;
  handling_fee: number;
  last_mile_fee: number;
  acquiring_percent: number;
  other_fees_percent: number;
  rfbs_delivery_percent: number;
  fbs_expenses_percent: number;
  rfbs_expenses_percent: number;
  expressions: { min_price: string; price: string; old_price: string };
}

export interface Calculation {
  id: number;
  offer_id: string;
  formula_version: string;
  ok: boolean;
  created_at: string;
  result?: { min_price?: Amount; price?: Amount; cost?: Amount; errors?: string[] };
  trace?: {
    actual_margin?: Record<string, unknown>;
    working_price?: Record<string, unknown>;
    minimum_price?: {
      [key: string]: unknown;
      expression?: string;
      variables?: Record<string, Amount>;
      formula_result?: Amount;
      working_result?: Amount;
    };
  };
}
export interface CalculationHistory {
  items: Calculation[];
  total: number;
}
export interface PricingSalesSnapshot {
  period: { from: string; to: string };
  row: {
    units_sold: number;
    sales_revenue: Amount;
    returns: Amount;
    revenue: Amount;
    ozon_accrual: Amount;
    cost: Amount;
    profit: Amount;
    has_cost_price: boolean;
  } | null;
}
