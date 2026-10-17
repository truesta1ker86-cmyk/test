import { ColumnRules } from '../models/filter.model';

export function parseColumnRules(raw: string): Record<string, ColumnRules> {
  try {
    const result = JSON.parse(raw || '{}');
    return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
  } catch {
    return {};
  }
}
