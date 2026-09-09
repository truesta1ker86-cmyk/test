export interface OrderItem {
  sku: number;
  offer_id: string;
  name: string;
  quantity: string;
  price: string;
}

export interface Order {
  posting_number: string;
  scheme: 'fbs' | 'fbo' | 'rfbs';
  status: string;
  in_process_at: string | null;      // дата создания заказа
  shipment_date: string | null;      // плановая дата отгрузки
  delivering_date: string | null;    // фактическая дата доставки
  label_downloaded_at: string | null;
  total_price: number | null;
  currency: string | null;
  items: OrderItem[];
  updated_at: string;                // дата последнего обновления
}

export interface OrderAction {
  code: string;
  label: string;
  description: string;
  can_execute: boolean;
}

export interface OrderResponse {
  items: Order[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    has_more: boolean;
  };
  summary: {
    current: number;
    completed: number;
    total: number;
  };
}

export interface OrderFilter {
  lifecycle: 'current' | 'completed';
  status?: string;
  scheme?: string;
  search?: string;
  sort?: 'date_desc' | 'date_asc' | 'number_asc' | 'number_desc';
  page?: number;
  pageSize?: number;
}
