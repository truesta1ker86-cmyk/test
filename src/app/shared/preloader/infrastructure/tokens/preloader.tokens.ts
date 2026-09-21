import { InjectionToken } from '@angular/core';

export interface PreloaderConfig {
  /** Пропускать HTTP-запросы с заголовком X-Skip-Preloader. */
  respectSkipHeader: boolean;

  /** Имя заголовка для пропуска. */
  skipHeaderName: string;

  /** Логировать ли ошибки HTTP в консоль. */
  logHttpErrors: boolean;

  /** Таймаут запроса в миллисекундах. */
  requestTimeoutMs: number;
}

export const DEFAULT_PRELOADER_CONFIG: PreloaderConfig = {
  respectSkipHeader: true,
  skipHeaderName: 'X-Skip-Preloader',
  logHttpErrors: true,
  requestTimeoutMs: 30_000,
};

export const PRELOADER_CONFIG = new InjectionToken<PreloaderConfig>(
  'PRELOADER_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_PRELOADER_CONFIG,
  },
);