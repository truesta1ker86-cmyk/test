import { SseStatus, SseErrorType } from '../types/sse.types';

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

export interface SseError {
  type: SseErrorType;
  message: string;
  /** HTTP-статус, если есть */
  status?: number;
  cause?: unknown;
  attempt?: number;
  timestamp: Date;
}

export interface RawSseEvent {
  id?: string;
  event: string; // 'message' | 'init' | 'new' | 'progress' | 'cleared' | ...
  data: string;
  retry?: number;
}
