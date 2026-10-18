import type { FilterConfig } from '../../../../infrastructure/interfaces/filter.interfaces';

export interface FilterGroup {
  key: string;
  name: string;
  filters: FilterConfig[];
}
