import { FilterConfig } from './filter.interfaces';
import { FilterValues, ValidFilterValues } from '../types/filter.types';

export interface FilterPanelContext {
  $implicit: {
    filters: FilterConfig[];
    groupedFilters: Record<string, FilterConfig[]>;
    values: FilterValues;
    validValues: ValidFilterValues;
    activeCount: number;
    hasChanges: boolean;
    isResetting: boolean;
    getValue: (key: string) => any;
    getError: (key: string) => string | null;
    isDisabled: (config: FilterConfig) => boolean;
    updateFilter: (key: string, value: any) => void;
    updateFilters: (updates: Partial<FilterValues>) => void;
    resetAllFilters: () => void;
    resetFilter: (key: string) => void;
    applyFiltersAction: () => void;
  };
}
