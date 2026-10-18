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
