import { InventoryStage, InventoryStageStatus } from '../types/progress.types';

export interface SyncProgress {
  source: string;
  processed: number;
  total: number;
  percent: number;
  status: string;
  running?: boolean;
  error?: string;
  job_id?: string;
}

export interface SseError {
  type: 'offline' | 'network' | 'timeout' | 'http' | 'auth' | 'parse' | 'max-retries' | 'unknown';
  message: string;
  status?: number;
  attempt?: number;
  timestamp: Date;
}

export interface InventoryStageView {
  key: string;
  label: string;
  status: InventoryStageStatus;
  detail: string;
}

export interface InventoryPullEvent {
  job_id: string;
  stage: InventoryStage;
  status: 'running' | 'done' | 'failed' | 'imported';
  percent?: number;
  stages?: Record<string, InventoryStageStatus>;
  current?: number;
  total?: number;
  raw?: number;
  normalized?: number;
  accepted?: number;
  migrated?: number;
  conflicts?: number;
  warehouses?: number;
  analytics?: number;
  stocks?: number;
  costs?: number;
  suppliers?: number;
  warnings?: number;
  stocks_accepted?: number;
  costs_accepted?: number;
  measured_at?: string;
  error?: string;
}

export interface LastSyncRun {
  found: boolean;
  id?: number;
  source?: string;
  job_id?: string;
  status?: string;
  stage?: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  accepted?: number;
  migrated?: number;
  conflicts?: number;
  warehouses?: number;
  stocks?: number;
  costs?: number;
  stocks_accepted?: number;
  costs_accepted?: number;
  error?: string;
}

export interface WarehouseOption {
  warehouse_id: string;
  warehouse_name: string;
  enabled: boolean;
}
