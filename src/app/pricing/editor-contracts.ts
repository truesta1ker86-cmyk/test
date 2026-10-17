import { PricingQuery, pricingScopeFilters } from './pricing-query';
export interface Scope {
  offer_ids?: string[];
  filters?: Record<string, unknown>;
}
export interface EditorConfig {
  offer_id: string;
  version: string;
  updated_at: string | null;
  [key: string]: unknown;
}
export interface BulkPreview {
  operation_id: string;
  matched: number;
  eligible: number;
  skipped: number;
  expires_at: string;
  changes: Record<string, unknown>;
  sample: { offer_id: string; before: Record<string, unknown>; after: Record<string, unknown> }[];
}
export interface BulkOperation {
  operation_id: string;
  status: string;
  applied: number;
  undone: number;
  conflicts: number;
  can_undo: boolean;
  changes: Record<string, unknown>;
}
export interface EditResult {
  saved?: boolean;
  applied?: number;
  undone?: number;
  conflicts?: number;
  skipped?: number;
  total?: number;
  recalculated?: number;
  failed?: number;
  recalculation_failed?: number;
  message?: string;
  duplicate?: boolean;
  calculation?: { ok: boolean; errors?: string[] };
}
export function filterScope(query: PricingQuery): Scope {
  return { filters: pricingScopeFilters(query) };
}
