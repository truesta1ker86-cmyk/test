import { InjectionToken } from '@angular/core';

export interface SseConfig {
  url: string;
  autoConnect?: boolean;

  /** Дополнительные HTTP-заголовки (Authorization и т.п.) */
  headers?: Record<string, string>;
  /** Отправлять cookies */
  withCredentials?: boolean;
  /** HTTP-метод. По умолчанию GET */
  method?: 'GET' | 'POST';

  // === Переподключение ===
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;

  // === Heartbeat ===
  heartbeatTimeout?: number;

  // === Лимиты и производительность ===
  maxItems?: number;
  batchInterval?: number;
  errorLogThrottle?: number;
  logUnknownEvents?: boolean;

  // === Авторизация ===
  /**
   * Вызывается при 401/403. Должен вернуть новый токен или обновить headers.
   * Возвращает:
   *   - новый объект headers — использовать их и переподключиться
   *   - null — прекратить попытки (статус failed)
   */
  onUnauthorized?: () => Promise<Record<string, string> | null>;

  // === Колбэки ===
  onError?: (error: SseError) => void;
  onReconnect?: (attempt: number) => void;
  onStatusChange?: (status: SseStatus) => void;
  /** Сырые события SSE — для отладки */
  onRawEvent?: (event: RawSseEvent) => void;
}

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'failed';

export type SseErrorType =
  | 'network'
  | 'offline'
  | 'timeout'
  | 'http' // 4xx/5xx
  | 'auth' // 401/403
  | 'parse'
  | 'max-retries'
  | 'aborted' // AbortController.abort()
  | 'unknown';

export interface SseError {
  type: SseErrorType;
  message: string;
  /** HTTP-статус, если есть */
  status?: number;
  cause?: unknown;
  attempt?: number;
  timestamp: Date;
}

/** Сырое SSE-событие после парсинга формата */
export interface RawSseEvent {
  id?: string;
  event: string; // 'message' | 'init' | 'new' | 'progress' | 'cleared' | ...
  data: string;
  retry?: number;
}

export type ResolvedSseConfig = Required<
  Pick<
    SseConfig,
    | 'url'
    | 'autoConnect'
    | 'withCredentials'
    | 'method'
    | 'maxRetries'
    | 'baseDelay'
    | 'maxDelay'
    | 'heartbeatTimeout'
    | 'maxItems'
    | 'batchInterval'
    | 'errorLogThrottle'
    | 'logUnknownEvents'
  >
> &
  Pick<
    SseConfig,
    'headers' | 'onUnauthorized' | 'onError' | 'onReconnect' | 'onStatusChange' | 'onRawEvent'
  >;

export const SSE_CONFIG = new InjectionToken<ResolvedSseConfig>('SSE_CONFIG');

export function resolveSseConfig(config: SseConfig): ResolvedSseConfig {
  return {
    url: config.url,
    autoConnect: config.autoConnect ?? false,
    withCredentials: config.withCredentials ?? false,
    method: config.method ?? 'GET',
    maxRetries: config.maxRetries ?? 10,
    baseDelay: config.baseDelay ?? 1000,
    maxDelay: config.maxDelay ?? 30_000,
    heartbeatTimeout: config.heartbeatTimeout ?? 45_000,
    maxItems: config.maxItems ?? 500,
    batchInterval: config.batchInterval ?? 100,
    errorLogThrottle: config.errorLogThrottle ?? 5_000,
    logUnknownEvents: config.logUnknownEvents ?? false,
    headers: config.headers,
    onUnauthorized: config.onUnauthorized,
    onError: config.onError,
    onReconnect: config.onReconnect,
    onStatusChange: config.onStatusChange,
    onRawEvent: config.onRawEvent,
  };
}
