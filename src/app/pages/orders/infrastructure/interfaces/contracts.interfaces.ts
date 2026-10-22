import type { Amount } from '../../../../core/infrastructure/types/contracts.types';

export interface OrderItem {
  main_image?: string | null;
  sku: number | null;
  offer_id: string | null;
  name: string | null;
  quantity: Amount;
  price: Amount;
}

export interface Order {
  id?: number;
  label_downloaded_at?: string | null;
  created_at?: string | null;
  posting_number: string;
  scheme: string | null;
  status: string | null;
  in_process_at: string | null;
  shipment_date: string | null;
  delivering_date: string | null;
  total_price: Amount;
  currency: string | null;
  items: OrderItem[];
  updated_at: string;
}

export interface ReturnRow {
  id?: number;
  name?: string | null;
  main_image?: string | null;
  return_id: number | null;
  posting_number: string | null;
  scheme: string | null;
  sku: number | null;
  offer_id: string | null;
  returns_amount: Amount;
  currency: string | null;
  returned_at: string | null;
  status: string | null;
}

export interface ListQuery {
  column_filters?: string;
  q: string;
  status: string;
  scheme: string;
  lifecycle: string;
  start: string;
  end: string;
  page: number;
  page_size: number;
  sort: string;
}

export interface ColumnValuesPage {
  values: string[];
  counts?: Record<string, number>;
  meta: { total: number; page: number; page_size: number; has_more: boolean };
}

export interface ColumnValuesState {
  field: string;
  values: string[];
  counts?: Record<string, number>;
  busy: boolean;
  error: string;
  total: number;
  hasMore: boolean;
}

export interface ListPage {
  local_preview?: boolean;
  column_values?: Record<string, string[]>;
  available_label_ids?: string[];
  items: (Order | ReturnRow)[];
  meta: { total: number; page: number; page_size: number; has_more: boolean };
  summary: { total: number; current?: number; completed?: number, available?: number };
  statuses: string[];
  snapshot_at: string;
}

export interface OrderDetail {
  local_preview?: boolean;
  order: Order;
  actions: { code: string; label: string; description: string; can_execute: boolean }[];
  notice: string;
  marketplace_actions_enabled: boolean;
}

export interface Overview {
  status: {
    name: string;
    last_synced_at: string | null;
    is_active: boolean;
    totals: { orders: number; stocks_rows: number; returns: number; finance_rows: number };
    integrations: {
      marketplace_state: string;
      onec_state: string;
      onec_last_snapshot_at: string | null;
      ai_state: string;
    };
    last_errors: { entity: string; error: string | null; completed_at: string | null }[];
  };
  products: number;
  recent_orders: Order[];
  operations: {
    entity: string;
    status: string;
    affected: number | null;
    completed_at: string;
    error: string | null;
  }[];
}
