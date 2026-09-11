import { InjectionToken } from '@angular/core';
import { UiSelectConfig } from '../types/select.types';

export const UI_SELECT_DEFAULTS = new InjectionToken<UiSelectConfig>(
  'UI_SELECT_DEFAULTS',
  {
    providedIn: 'root',
    factory: (): UiSelectConfig => ({
      size: 'normal',
      appearance: 'default',
      showClear: false,
      filter: false,
      filterMatchMode: 'contains',
      emptyMessage: 'Нет данных',
      emptyFilterMessage: 'Ничего не найдено',
    }),
  },
);