import { InjectionToken } from '@angular/core';

export interface PreloaderConfig {
  respectSkipHeader: boolean;
  skipHeaderName: string;
  logHttpErrors: boolean;
}

export const DEFAULT_PRELOADER_CONFIG: PreloaderConfig = {
  respectSkipHeader: true,
  skipHeaderName: 'X-Skip-Preloader',
  logHttpErrors: true,
};

export const PRELOADER_CONFIG = new InjectionToken<PreloaderConfig>('PRELOADER_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_PRELOADER_CONFIG,
});
