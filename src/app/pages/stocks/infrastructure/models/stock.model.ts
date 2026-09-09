export interface Stock {
    offer_id: string;
    sku?: string;
    sku_1c?: string;
    source: 'ozon' | '1c';
    available: number;
    reserved: number;
    shipping?: number;
    warehouse_id?: string;
    warehouse_name?: string;
    product_name?: string;
    main_image?: string;
  }
  
  export interface ReconciliationItem {
    offer_id: string;
    product_name?: string;
    main_image?: string;
    physical_1c: number | null;
    reserved_1c?: number;
    ozon_fbs_available: number | null;
    ozon_fbs_reserved?: number;
    protected_fbs_orders?: number;
    active_fbs_orders?: number;
    ambiguous_fbs_orders?: number;
    calculated_publishable: number | null;
    safe_publishable: number | null;
    difference?: number;
    status?: string;
    one_c_measured_at?: string;
    ozon_updated_at?: string;
  }
  
  export interface StocksResponse {
    items: Stock[];
    meta: { total: number; has_more: boolean };
  }
  
  export interface ReconciliationResponse {
    items: ReconciliationItem[];
  }

  export interface StockFilter {
    search: string;
    source: 'ozon' | '1c' | '';
    category: string;
    type: string;
    brand: string;
    group: string; 
    series: string;
    length: string;
    color: string;
    package: string;
  }

  export interface Warehouse {
    warehouse_id: string;
    warehouse_name: string;
    is_rfbs?: boolean;
    status?: string;
  }
  
  export interface WarehouseSettings {
    warehouse_id: string;
    mode: 'share' | 'target';
    value: number;
    quantum: number;
  }  
  
  