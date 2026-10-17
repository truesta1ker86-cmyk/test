import { SellerSession } from '../core/contracts';
export interface Shop {
  tenant_id: number;
  name: string;
  ozon_client_id: string;
  is_active: boolean;
  is_current: boolean;
  has_api_key: boolean;
  has_performance_api: boolean;
  last_synced_at: string | null;
}
export interface Member {
  id: number;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}
export interface AiSettings {
  key_configured: boolean;
  status: string;
  message: string;
  text_model: string;
  image_model: string | null;
  monthly_budget_usd: string;
  last_checked_at: string | null;
  runtime_enabled: boolean;
}
export interface Onec {
  configured: boolean;
  ready: boolean;
  secure_transport: boolean;
  base_url: string | null;
  username: string | null;
  message: string;
  last_checked_at: string | null;
  resource_preview: string[];
}
export interface Billing {
  balance_rub: string;
  spent_rub: string;
  generation_price_rub: string;
  card_content_price_rub: string;
  image_generation_price_rub: string;
  can_generate: boolean;
  can_generate_card_content: boolean;
  can_generate_image: boolean;
  generation_block_reason: string | null;
  image_generation_block_reason: string | null;
  model: string;
  image_model: string | null;
  shared_shop_count: number;
  pending_top_up_amount_rub: string;
  top_up_requests: {
    id: number;
    amount_rub: string;
    status: string;
    created_at: string;
    note: string | null;
    admin_note: string | null;
  }[];
  transactions: {
    id: number;
    entry_type: string;
    status: string;
    amount_rub: string;
    balance_after_rub: string;
    description: string;
    operation: string | null;
    created_at: string;
  }[];
}
export interface Account {
  local_preview?: boolean;
  stock_automation?: {
    rules_count: number;
    enabled_rules_count: number;
    fixed_target_rules_count: number;
    interval_seconds: number;
  } | null;
  session: SellerSession;
  is_owner: boolean;
  shops: Shop[];
  members: Member[];
  ai_settings: AiSettings | null;
  onec: Onec | null;
  billing: Billing;
}
export interface PullPreview {
  stock_rows: number;
  cost_rows: number;
  sku_count: number;
  warehouse_count: number;
  warnings: string[];
  cost_preview: { sku_1c: string; selected_cost: string; cost_source: string }[];
}
