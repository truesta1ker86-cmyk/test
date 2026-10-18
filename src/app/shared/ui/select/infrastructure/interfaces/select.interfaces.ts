import { UiSelectSize, UiSelectAppearance, UiSelectFilterMatchMode } from '../types/select.types';

export interface UiSelectOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
  group?: string;
  icon?: string;
  description?: string;
}

export interface UiSelectConfig {
  size: UiSelectSize;
  appearance: UiSelectAppearance;
  showClear: boolean;
  filter: boolean;
  filterMatchMode: UiSelectFilterMatchMode;
  emptyMessage: string;
  emptyFilterMessage: string;
}
