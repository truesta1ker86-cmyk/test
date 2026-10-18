import { SseConfig } from '../interfaces/sse.interfaces';

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
