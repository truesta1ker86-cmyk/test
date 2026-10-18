export interface Issue {
  level: string;
  sheet: string;
  row?: number;
  field?: string;
  message: string;
  code: string;
}

export interface ImportSheet {
  name: string;
  sheet_index: number;
  domain: string;
  row_count: number;
  ignored?: boolean;
  mappings: {
    column_index: number;
    source_header: string;
    target_field: string | null;
    confidence?: number;
    sample_values?: unknown[];
  }[];
  sample_rows: Record<string, unknown>[];
}

export interface ImportJob {
  job_id: string;
  filename: string;
  status: string;
  revision: string;
  source_format: string;
  sheets: ImportSheet[];
  validation: { errors: number; warnings: number; issues: Issue[] };
  ai_mapping?: { status: string; charged: boolean };
}

export interface ImportHistory {
  job_id: string;
  filename: string;
  status: string;
  rows: number;
  errors: number;
  warnings: number;
  created_at: string;
  applied_at: string | null;
}

export interface ImportProfile {
  id: number;
  name: string;
  version: number;
  use_count: number;
  last_used_at: string | null;
}

export interface ImportWorkspace {
  items: ImportHistory[];
  total: number;
  profiles: ImportProfile[];
  fields: { name: string; label: string; kind: string }[];
  can_manage: boolean;
}

export interface ImportPreview {
  revision: string;
  records_created: number;
  records_updated: number;
  records_unchanged: number;
  changes_truncated: boolean;
  changes: {
    entity: string;
    key: string;
    action: string;
    source_row: number | null;
    fields: Record<string, { old: unknown; new: unknown }>;
  }[];
}
