export interface WorkingCellChange {
  field: 'price' | 'min_price' | 'margin';
  value: string | number | boolean | null;
  reset?: boolean;
}
