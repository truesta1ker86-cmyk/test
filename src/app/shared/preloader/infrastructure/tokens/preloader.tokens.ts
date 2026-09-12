import { InjectionToken } from '@angular/core';

export interface PreloaderConfig {
  minDisplayMs: number;
  delayMs: number;
  respectSkipHeader: boolean;
  skipHeaderName: string;
}

export const DEFAULT_PRELOADER_CONFIG: PreloaderConfig = {
  minDisplayMs: 300,
  delayMs: 150,
  respectSkipHeader: true,
  skipHeaderName: 'X-Skip-Preloader',
};

export const PRELOADER_CONFIG = new InjectionToken<PreloaderConfig>('PRELOADER_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_PRELOADER_CONFIG,
});
