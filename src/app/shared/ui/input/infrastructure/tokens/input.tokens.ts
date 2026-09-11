// input.tokens.ts
import { InjectionToken } from '@angular/core';
import { UiInputConfig } from '../types/input.types';


export const UI_INPUT_DEFAULTS = new InjectionToken<UiInputConfig>('UI_INPUT_DEFAULTS', {
  providedIn: 'root',
  factory: (): UiInputConfig => ({
    size: 'normal',
    appearance: 'default',
    showEmptyLabel: false,
  }),
});
