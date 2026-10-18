import type { Amount } from '../../../../core/infrastructure/types/contracts.types';
import { CatalogMode, ActionKind } from '../types/contracts.types';

export interface Category {
  description_category_id: number;
  type_id: number;
  category_name: string | null;
  type_name: string | null;
  path: string | null;
}

export interface AttributeDefinition {
  attribute_id: number;
  name: string;
  description: string | null;
  type: string | null;
  group_id: number | null;
  group_name: string | null;
  dictionary_id: number;
  is_required: boolean;
  is_collection: boolean;
  max_value_count: number;
  attribute_complex_id: number;
  complex_is_collection: boolean;
}

export interface ComplexGroup {
  attributes: {
    id: number;
    complex_id: number;
    values: { value?: string | null; dictionary_value_id?: number | null }[];
  }[];
}

export interface FullPayload extends CardPayload {
  description_category_id?: number | null;
  type_id?: number | null;
  price?: string | null;
  old_price?: string | null;
  vat?: string | null;
  color_image?: string | null;
  complex_attributes?: ComplexGroup[];
}

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface Validation {
  ready: boolean;
  issues: ValidationIssue[];
  required_total: number;
  required_missing: number;
}

export interface FullWorkspace {
  snapshot?: FullPayload;
  local_preview?: boolean;
  offer_id: string;
  version: string;
  working_copy: FullPayload;
  attributes_meta: AttributeDefinition[];
  snapshot_complete: boolean;
  snapshot_synced_at: string;
  is_new: boolean;
  category: {
    category_id: number;
    type_id: number;
    name: string | null;
    type_name: string | null;
    path: string | null;
  } | null;
  validation: Validation;
  versions: {
    version: number;
    created_at: string;
    status: string;
    changes: { field: string; label: string; before: unknown; after: unknown }[];
  }[];
  changes: { field: string; label: string; before: unknown; after: unknown }[];
}

export interface DictionaryValue {
  id: number;
  value: string;
  info?: string | null;
}

export interface CategoryPreview {
  category_id: number;
  type_id: number;
  kept: Attribute[];
  removed: Attribute[];
  attributes: AttributeDefinition[];
  complex_will_be_removed: boolean;
}

export interface MediaItem {
  id: number;
  offer_id: string;
  version: number;
  status: string;
  content_url: string;
  media_type: string;
  width: number;
  height: number;
  byte_size: number;
  prompt: string;
  model: string;
  technical_ready: boolean;
  moderation_confirmed: boolean;
}

export interface AiResult {
  category_id: number;
  type_id: number;
  operation_id: string;
  kind: 'content' | 'attributes' | 'image';
  status: string;
  result: {
    title?: string;
    description?: string;
    suggestions?: { attribute_id: number; name?: string; values: string[]; confidence?: string }[];
    warnings?: string[];
    media?: MediaItem;
  } | null;
  error: string | null;
  created_at: string;
  accepted?: boolean | null;
}

export interface AiStatus {
  balance_rub: string;
  provider_ready: boolean;
  operations: {
    kind: 'content' | 'attributes' | 'image';
    name: string;
    price_rub: string;
    model: string;
    available: boolean;
    block_reason: string | null;
  }[];
}

export interface AttributeOperation {
  operation_id: string;
  status: string;
  attribute: { id: number; name: string; is_required?: boolean };
  matched: number;
  eligible: number;
  skipped: number;
  applied: number;
  undone: number;
  conflicts: number;
  created_at: string;
  expires_at: string;
  sample: { offer_id: string; name: string; before: Attribute | null; after: Attribute | null }[];
}

export interface CatalogQuery {
  mode: CatalogMode;
  days: number;
  page: number;
  page_size: number;
  q: string;
  name_search: string;
  mapping_reason: string;
  articles: string;
  exclude_articles: boolean;
  category: string;
  type: string;
  brand: string;
  fin_type: string;
  report_category: string;
  report_type: string;
  product_group: string;
  series: string;
  color: string;
  length_mm: string;
  package_qty: string;
  units_per_item: string;
  state: string;
  mapping_status: string;
  cost_mode: string;
  sort: string;
  direction: string;
  rules: string;
  column_filters: string;
}

export interface SavedView {
  view_id: string;
  name: string;
  query: CatalogQuery;
}

export interface CatalogRow {
  version?: string;
  suggestion_skus?: string[];
  warehouse_count?: number;
  onec_unit_cost?: Amount;
  fixed_margin?: Amount;
  calculated_price?: Amount;
  report_category_source?: string;
  report_type_source?: string;
  promotion_model?: number | null;
  category_promotion_model?: number | null;
  effective_promotion_model?: number | null;
  promotion_model_title?: string;
  promotion_model_source?: string;
  draft_version?: number;
  marketplace_name?: string | null;
  offer_id: string;
  name?: string | null;
  sku?: number | null;
  main_image?: string | null;
  brand?: string | null;
  category_name?: string | null;
  type_name?: string | null;
  fin_type?: string | null;
  report_category?: string | null;
  report_type?: string | null;
  state?: string | null;
  sku_1c?: string | null;
  onec_code?: string | null;
  onec_name?: string | null;
  onec_ref?: string | null;
  units_per_item?: number;
  unit_cost?: Amount;
  package_cost?: Amount;
  automatic_unit_cost?: Amount;
  manual_unit_cost?: Amount;
  marketplace_unit_cost?: Amount;
  cost_mode?: string | null;
  cost_source?: string | null;
  price?: Amount;
  units_sold?: number;
  revenue?: Amount;
  rating?: Amount;
  reviews_count?: number;
  mapping_status: string;
  mapping_group?: string;
  mapping_reason?: string;
  suggested_sku_1c?: string | null;
  available?: number;
  reserved?: number;
  shared_offer_count?: number;
  onec_base_units_per_item?: number | null;
  onec_quant_multiple?: boolean | null;
}

export interface CatalogPage {
  local_preview?: boolean;
  can_manage?: boolean;
  column_values?: Record<string, string[]>;
  items: CatalogRow[];
  meta: { total: number; page: number; page_size: number; has_more: boolean };
  summary: Record<string, number>;
  facets: Record<string, { value: string; count: number }[]>;
}

export interface Candidate {
  sku_1c: string;
  onec_code?: string | null;
  onec_name?: string | null;
  onec_ref?: string | null;
  available: number;
  selected_cost?: Amount;
  is_verified: boolean;
}

export interface CharacteristicCandidate {
  sku_1c: string;
  reference_offer_id?: string | null;
  reference_name?: string | null;
  score: number;
  confidence: string;
  can_accept: boolean;
  blocked_reasons: string[];
  comparisons: {
    field: string;
    marketplace_value: string | null;
    onec_value: string | null;
    result: string;
  }[];
}

export interface CatalogOperation {
  operation_id: string;
  kind: ActionKind;
  status: string;
  matched: number;
  eligible: number;
  skipped?: number;
  applied: number;
  undone: number;
  conflicts: number;
  changes: Record<string, unknown>;
  created_at: string;
  expires_at: string;
  duplicate?: boolean;
  sample?: {
    offer_id: string;
    name: string;
    before_values?: Record<string, unknown>;
    after_values?: Record<string, unknown>;
    before: {
      config: Record<string, unknown> | null;
      price: Record<string, unknown> | null;
      product: Record<string, unknown> | null;
    };
    after: Record<string, unknown>;
  }[];
  selected_product?: { onec_code: string; sku_1c: string | null; onec_name: string | null };
  shared_offer_count?: number;
}

export interface Attribute {
  id: number;
  values: { value?: string | null; dictionary_value_id?: number | null }[];
}

export interface CardPayload {
  offer_id: string;
  name: string;
  description?: string | null;
  barcode?: string | null;
  images?: string[];
  weight?: Amount;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  attributes?: Attribute[];
}

export interface CardWorkspace {
  offer_id: string;
  version: string;
  working_copy: CardPayload;
  snapshot_complete: boolean;
  snapshot_synced_at: string;
  attributes_meta: { id: number; name: string; is_dictionary: boolean }[];
  changes: { field: string; label: string; before: unknown; after: unknown }[];
  versions: {
    version: number;
    created_at: string;
    status: string;
    changes: { field: string; label: string }[];
  }[];
}

export interface ProductDetailsData {
  product: CatalogRow;
  total_units: number;
  total_revenue: string;
  average_price: string | null;
  timeline: { date: string; units: number; revenue: string }[];
  orders: { posting_number: string; date: string; quantity: number; amount: string }[];
}

export interface CampaignPlan {
  items: { offer_id: string; name: string; price: Amount }[];
  matched: number;
  campaign: string;
  action: string;
  message: string;
  sends_enabled: false;
  sent: 0;
}
