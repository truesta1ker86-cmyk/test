export type UiDateSize = 'compact' | 'normal' | 'large';
export type UiDateAppearance = 'default' | 'filled' | 'outline';
export type UiDateSelectionMode = 'single' | 'range' | 'multiple';
export type UiDateView = 'date' | 'month' | 'year';

export interface UiDateConfig {
  size: UiDateSize;
  appearance: UiDateAppearance;
  dateFormat: string;
  showTime: boolean;
  hourFormat: '12' | '24';
  showIcon: boolean;
  showButtonBar: boolean;
  showClear: boolean;
  firstDayOfWeek: number;
}
