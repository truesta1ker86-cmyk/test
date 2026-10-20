export interface ColumnRule {
  values: string[] | null;
  text: string;
  operator: 'contains' | 'not_contains';
  min: string;
  max: string;
}

export interface ColumnChange {
  field: string;
  rule: ColumnRule | null;
}

export interface ColumnValuesRequest {
  search: string;
  page: number;
}
