import { SseConfig } from '../interfaces/sse.interfaces';
import { ResolvedSseConfig } from '../types/sse.types';

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
