import { FilterConfig } from './filter.interfaces';

export interface FilterControlContext {
  $implicit: {
    config: FilterConfig;
    value: any;
    error: string | null;
    disabled: boolean;
    updateValue: (value: any) => void;
    getValue: () => any;
  };
}
