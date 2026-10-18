import { UiDateSize, UiDateAppearance } from '../types/date.types';

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
