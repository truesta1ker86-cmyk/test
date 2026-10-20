export interface SalesDay {
  date: string;
  units: number;
  revenue: string;
}

export interface SalesDynamics {
  days: number;
  timeline: SalesDay[];
  total_units: number;
  total_revenue: string;
  best_day: SalesDay | null;
  sales_basis: 'delivered_orders';
  sales_date_field: 'in_process_at';
  snapshot_at: string | null;
}
