import { Attribute, CardPayload } from '../catalog/contracts';
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
