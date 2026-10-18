import { InjectionToken } from '@angular/core';
import { PreloaderConfig } from '../interfaces/preloader.interfaces';

export const DEFAULT_PRELOADER_CONFIG: PreloaderConfig = {
  respectSkipHeader: true,
  skipHeaderName: 'X-Skip-Preloader',
  logHttpErrors: true,
  requestTimeoutMs: 30_000,
};

export const PRELOADER_CONFIG = new InjectionToken<PreloaderConfig>('PRELOADER_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_PRELOADER_CONFIG,
});
