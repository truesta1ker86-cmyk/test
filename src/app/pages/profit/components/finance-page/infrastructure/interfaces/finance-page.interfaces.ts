import { Entry } from '../types/finance-page.types';

export interface FinanceData {
  local_preview?: boolean;
  view: string;
  tax_regime: string;
  snapshot_at: string;
  report: Entry;
  can_manage: boolean;
}
