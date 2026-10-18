export interface SyncProgress {
  source: string;
  processed: number;
  total: number;
  percent: number;
  status: string;
}

export interface HookEntry {
  id: number;
  received_at: string;
  source: string;
  message_type: string;
  body: string;
  remote_ip: string;
}
