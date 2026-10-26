export interface DataTableToolbarFilterValue {
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

export interface DataTableToolbarFilterOption {
  value: string;
  label: string;
}
