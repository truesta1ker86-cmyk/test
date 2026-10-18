export interface PriceColumnFilter {
  values: string[];
  text: string;
  operator: string;
  min: string;
  max: string;
}

export interface PriceColumnChange {
  field: string;
  value: PriceColumnFilter | null;
}
