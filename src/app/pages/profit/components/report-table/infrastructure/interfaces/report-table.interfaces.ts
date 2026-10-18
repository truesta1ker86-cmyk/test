import type { ProductPreviewData } from '../../../../../../shared/product-preview/infrastructure/interfaces/product-name.interfaces';

export interface Column {
  group?: string;
  groupLabel?: string;
  note?: string;
  key: string;
  label: string;
  format?: 'money' | 'number' | 'percent' | 'text';
}

export interface ReportRow {
  preview?: ProductPreviewData;
  cellNotes?: Record<string, string>;
  isTotal?: boolean;
  isGroup?: boolean;
  id: string;
  label: string;
  offer?: string;
  cells: Record<string, string | number | null | undefined>;
  children?: ReportRow[];
  complete?: boolean;
  note?: string;
}
