import type { PricingRow } from '../../../../../../core/infrastructure/interfaces/contracts.interfaces';
import type { SortColumn } from '../../../../infrastructure/types/pricing-query.types';
import type { WorkingCellChange } from '../../../working-cell/infrastructure/interfaces/working-cell.interfaces';

export type PricingCellChange = { row: PricingRow; field: string; value: string };

export type PricingWorkingChange = WorkingCellChange & { row: PricingRow };

export type Column = {
  key: string;
  label: string;
  kind?: 'money' | 'rate';
  edit?: string;
  working?: WorkingCellChange['field'];
  sort?: SortColumn;
};
