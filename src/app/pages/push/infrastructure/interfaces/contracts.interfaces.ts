import { PromotionModel } from '../types/contracts.types';

export interface Policy {
  offer_id: string;
  name: string;
  main_image?: string | null;
  category: string | null;
  category_id: number | null;
  model: PromotionModel;
  category_model: PromotionModel;
  effective_model: PromotionModel;
  model_source: string;
}

export interface CategoryRule {
  category_id: number;
  category: string;
  products: number;
  model: PromotionModel;
}

export interface Action {
  id: number;
  title: string;
  action_type: string;
  is_voucher_action: boolean;
  freeze_date: string | null;
  date_start?: string;
  date_end?: string;
}

export interface CampaignRow {
  key: string;
  offer_id: string;
  name: string;
  main_image?: string | null;
  category: string | null;
  category_id: number | null;
  action_id: number;
  action: string;
  participating: boolean;
  upcoming: boolean;
  model: PromotionModel;
  model_source: string;
  minimum_price: string | null;
  current_price: string | null;
  desired_price: string | null;
  recommended_price: string | null;
  price_min_elastic: string | null;
  price_max_elastic: string | null;
  orders_7_days: number | null;
  decision: string;
  reason: string;
  warning: string | null;
}

export interface RuleChange {
  id: string | number;
  before: PromotionModel;
  after: PromotionModel;
}

export interface RuleOperation {
  operation_id: string;
  scope: 'category' | 'product';
  status: string;
  created_at: string;
  model: PromotionModel;
  changed: number;
  changes: RuleChange[];
  undone?: number;
  conflicts?: number;
}

export interface PromoWorkspace {
  sandbox_db?: boolean;
  local_preview?: boolean;
  sends_enabled: boolean;
  revision: string;
  can_manage: boolean;
  categories: CategoryRule[];
  products: Policy[];
  history: RuleOperation[];
  send_history?: unknown[];
  preview: {
    requires_refresh: boolean;
    fetched_at?: string;
    orders_complete?: boolean;
    actions: Action[];
    rows: CampaignRow[];
    totals: Record<string, number>;
  };
}

export interface PlanRow extends CampaignRow {
  status: 'ready' | 'blocked' | 'unchanged';
  command: 'update' | 'deactivate' | 'update_remove' | null;
  stock: number | null;
}

export interface PromotionPlan {
  operation_id: string;
  status: 'prepared' | 'stale' | 'expired';
  created_at: string;
  expires_at: string;
  action: Action;
  operation: string;
  price_mode: string;
  rows: PlanRow[];
  revision: string;
  sent: number;
  sends_enabled: false;
}

export interface PlanRequest {
  action_id: number;
  offer_ids: string[];
  operation: 'join' | 'leave' | 'model';
  price_mode: 'model' | 'recommended' | 'minimum' | 'manual';
  action_price?: string;
  stock?: number;
}
