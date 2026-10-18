import { FilterControlType } from '../types/filter.types';

export interface FilterOption {
  value: any;
  label: string;
  disabled?: boolean;
  children?: FilterOption[];
}

export interface FilterExtra {
  prefix?: string;
  suffix?: string;
  minDate?: string | Date;
  maxDate?: string | Date;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: any;
}

export interface FilterConfig<T = any> {
  key: string;
  label: string;
  type: FilterControlType;
  defaultValue?: T;
  placeholder?: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  validation?: (value: T, allValues?: Record<string, any>) => boolean;
  errorMessage?: string;
  disabled?: boolean;
  hidden?: boolean;
  dependsOn?: string | string[];
  dependsOnValue?: any;
  order: number;
  group?: string;
  width?: string;
  extra?: FilterExtra;
}
