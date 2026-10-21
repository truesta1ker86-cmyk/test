export interface DataTableFilterRule {
  values: string[] | null;
  excluded_values?: string[];
  text: string;
  operator: 'contains' | 'not_contains';
  min: string;
  max: string;
}

export interface DataTableFilterChange {
  field: string;
  rule: DataTableFilterRule | null;
}

export interface DataTableFilterValuesRequest {
  search: string;
  page: number;
}
