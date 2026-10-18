export interface TrackedError {
  message: string;
  source?: string;
  error?: unknown;
  at: Date;
}
