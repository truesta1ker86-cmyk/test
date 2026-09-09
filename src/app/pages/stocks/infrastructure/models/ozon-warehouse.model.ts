export interface OzonWarehouse {
  warehouse_id: string;
  warehouse_name: string;
  status: 'created' | 'archived' | string; // может быть и другие статусы
  is_rfbs: boolean;
  is_kgt: boolean;
  is_economy: boolean;
}

export interface OzonWarehouseResponse {
  items: OzonWarehouse[];
}
