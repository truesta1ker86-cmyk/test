export interface FallbackOptions<T> {
  fallback: T;
  onError?: (error: unknown) => void;
}
