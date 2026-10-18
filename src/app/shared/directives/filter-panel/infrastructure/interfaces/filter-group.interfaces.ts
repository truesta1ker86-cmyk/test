import { FilterConfig } from './filter.interfaces';

export interface FilterGroupContext {
  $implicit: {
    groupName: string;
    filters: FilterConfig[];
    values: Record<string, any>;
    getValue: (key: string) => any;
    updateFilter: (key: string, value: any) => void;
  };
}
