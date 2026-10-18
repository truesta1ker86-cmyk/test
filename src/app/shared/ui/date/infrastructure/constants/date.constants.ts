import { InjectionToken } from '@angular/core';
import { UiDateConfig } from '../interfaces/date.interfaces';

export const UI_DATE_DEFAULTS = new InjectionToken<UiDateConfig>('UI_DATE_DEFAULTS', {
  providedIn: 'root',
  factory: (): UiDateConfig => ({
    size: 'normal',
    appearance: 'default',
    dateFormat: 'dd.mm.yy',
    showTime: false,
    hourFormat: '24',
    showIcon: true,
    showButtonBar: false,
    showClear: false,
    firstDayOfWeek: 1,
  }),
});
