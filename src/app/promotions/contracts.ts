export type PromotionModel = 0 | 1 | 2 | null;
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
export const modelNames: Record<number, string> = {
  0: 'Не участвовать',
  1: 'Бустинг и цена Ozon',
  2: 'По минимальной цене',
};
export const modelLabel = (value: PromotionModel | undefined, category = false) =>
  value == null ? (category ? 'Не назначена' : 'По правилу категории') : modelNames[value];
export const modelHelp = (value: PromotionModel) =>
  value === 0
    ? 'Запрет участия по модели. Сохранение правила не удаляет товар из действующих акций.'
    : value === 1
      ? 'Обычные акции — рекомендованная цена Ozon, в том числе ниже минималки. В бустинге — цена максимального бустинга; при отсутствии заказов за 7 суток — минималка.'
      : value === 2
        ? 'В каждой подходящей акции — минималка. Отсутствие заказов не меняет правило.'
        : 'Индивидуального правила нет; действует правило категории, если оно назначено.';
