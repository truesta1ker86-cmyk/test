import { Injectable, NgZone, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'failed';
export type PageState = 'checking' | 'ready' | 'failed' | 'reconnecting';

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

export type InventoryStage =
  | 'start'
  | 'catalog'
  | 'read'
  | 'normalize'
  | 'save'
  | 'migrate'
  | 'ka2_pull'
  | 'done'
  | 'error';

export type InventoryStageStatus = 'pending' | 'running' | 'done' | 'failed';

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

// === NEW: склад ===
export interface WarehouseOption {
  warehouse_id: string;
  warehouse_name: string;
  enabled: boolean;
}

@Injectable()
export class ProgressService implements OnDestroy {
  private zone = inject(NgZone);
  private http = inject(HttpClient);

  readonly status = signal<SseStatus>('idle');
  readonly retryCount$ = signal(0);
  readonly lastError = signal<SseError | null>(null);

  private es?: EventSource;

  readonly pageState = signal<PageState>('checking');

  readonly progress = signal<SyncProgress | null>(null);
  readonly progressList = signal<SyncProgress[]>([]);
  readonly ozonProgress = signal<SyncProgress | null>(null);

  readonly inventoryPull = signal<SyncProgress | null>(null);
  readonly inventoryJobId = signal<string | null>(null);
  readonly inventoryStages = signal<InventoryStageView[]>([]);
  readonly lastInventorySync = signal<LastSyncRun | null>(null);
  readonly lastOzonSync = signal<LastSyncRun | null>(null);

  readonly inventoryInterrupted = signal<LastSyncRun | null>(null);
  readonly ozonInterrupted = signal<LastSyncRun | null>(null);

  // === NEW: склады ===
  readonly knownWarehouses = signal<WarehouseOption[]>([]);
  readonly warehousesLoading = signal(false);

  private readonly _inventoryStageDefs: { key: string; label: string }[] = [
    { key: 'catalog', label: 'Каталог 1С' },
    { key: 'ka2_pull', label: 'Остатки / себестоимость' },
    { key: 'save', label: 'Запись в БД' },
    { key: 'done', label: 'Завершено' },
  ];

  private readonly _stageOrder = ['catalog', 'ka2_pull', 'save', 'done'];

  private readonly _jobStorageKey = 'inventory_job_id';

  readonly overlayCollapsed = signal(false);
  collapseOverlay(): void {
    this.overlayCollapsed.set(true);
  }
  expandOverlay(): void {
    this.overlayCollapsed.set(false);
  }

  readonly connected = computed(() => this.status() === 'open');
  readonly isHealthy = computed(() => this.status() === 'open' || this.status() === 'reconnecting');
  readonly online = computed(() => this.status() !== 'failed' && this.status() !== 'closed');
  readonly reconnecting = computed(() => this.status() === 'reconnecting');
  readonly serviceReady = computed(() => this.pageState() === 'ready');

  readonly isOzonRunning = computed(
    () => this.ozonProgress()?.status === 'running' || this.ozonProgress()?.running === true,
  );
  readonly isInventoryRunning = computed(
    () => this.inventoryPull()?.status === 'running' || this.inventoryPull()?.running === true,
  );

  readonly anyRunning = computed(() => this.isOzonRunning() || this.isInventoryRunning());

  readonly canEditOzon = computed(() => this.connected() && !this.isOzonRunning());
  readonly canEditInventory = computed(() => this.connected() && !this.isInventoryRunning());
  readonly canStopOzon = computed(() => this.isOzonRunning());
  readonly canEdit = computed(() => this.connected() && !this.anyRunning());
  readonly canStartAll = computed(
    () => this.connected() && (!this.isOzonRunning() || !this.isInventoryRunning()),
  );

  constructor() {
    this.restoreJobId();
    try {
      this.connectSse();
    } catch (e) {
      this.handleSseError(e);
    }
    this.watchVisibility();
    this.watchOnline();
  }

  // ==========================================================================
  // Утилиты
  // ==========================================================================
  private errMessage(v: unknown): string {
    if (v == null) return 'Неизвестная ошибка';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (v instanceof Error) return v.message || v.name || 'Ошибка';
    try {
      const s = JSON.stringify(v);
      return s && s !== '{}' ? s : 'Ошибка';
    } catch {
      return 'Ошибка';
    }
  }

  private handleSseError(e: unknown, type: SseError['type'] = 'network'): void {
    console.error('[SSE] error', e);
    this.status.set('failed');
    this.pageState.set('failed');
    this.lastError.set({
      type,
      message: this.errMessage(e),
      timestamp: new Date(),
    });
  }

  // ==========================================================================
  // SSE
  // ==========================================================================
  private connectSse(): void {
    try {
      if (this.es) {
        this.es.close();
        this.es = undefined;
      }

      this.status.set('connecting');
      console.log('[SSE] connecting...');

      this.es = new EventSource('/events/subscribe');

      this.es.onopen = () => {
        this.zone.run(() => {
          console.log('[SSE] open');
          this.status.set('open');
          this.retryCount$.set(0);
          this.lastError.set(null);
        });
      };

      this.es.onerror = () => {
        this.zone.run(() => {
          if (this.es?.readyState === EventSource.CONNECTING) {
            console.warn('[SSE] reconnecting...');
            this.status.set('reconnecting');
            this.retryCount$.update((n) => n + 1);
            this.lastError.set({
              type: 'network',
              message: 'Потеря связи, попытка переподключения…',
              timestamp: new Date(),
            });
          } else {
            this.handleSseError('Соединение потеряно');
          }
        });
      };

      this.es.addEventListener('init', (event: MessageEvent) => {
        this.zone.run(() => {
          try {
            const data = JSON.parse(event.data);
            console.log('[SSE] init:', data);
            this.pageState.set('ready');
          } catch (e) {
            console.error('[SSE] init parse error', e);
          }
        });
      });

      this.es.addEventListener('progress', (event: MessageEvent) => {
        this.zone.run(() => {
          try {
            const p: SyncProgress = JSON.parse(event.data);
            this.upsertProgress(p);
          } catch (e) {
            console.error('[SSE] progress parse error', e);
          }
        });
      });

      this.es.addEventListener('resumed', (event: MessageEvent) => {
        this.zone.run(() => {
          try {
            const p: SyncProgress = JSON.parse(event.data);
            this.upsertProgress(p);
            console.log('[SSE] resumed:', p);
          } catch (e) {
            console.error('[SSE] resumed parse error', e);
          }
        });
      });

      this.es.addEventListener('inventory_pull', (event: MessageEvent) => {
        this.zone.run(() => {
          try {
            const data: InventoryPullEvent = JSON.parse(event.data);
            this.applyInventoryPullEvent(data);
          } catch (e) {
            console.error('[SSE] inventory_pull parse error', e, event.data);
          }
        });
      });
    } catch (e) {
      this.handleSseError(e);
    }
  }

  // ==========================================================================
  // Watchers
  // ==========================================================================
  private watchVisibility(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (!this.es || this.es.readyState === EventSource.CLOSED) {
        console.log('[SSE] tab visible, SSE closed → reconnect');
        this.retryNow();
      } else {
        this.fetchInventoryStatus();
        this.fetchLastInventorySuccess();
        this.refreshOzon();
        this.fetchLastOzonSuccess();
        this.fetchLastInventoryRun();
        this.fetchLastOzonRun();
      }
    });
  }

  private watchOnline(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      console.log('[SSE] browser online → reconnect');
      this.retryNow();
    });
  }

  // ==========================================================================
  // Публичное API
  // ==========================================================================
  retryNow(): void {
    this.retryCount$.set(0);
    this.lastError.set(null);
    this.pageState.set('checking');

    try {
      this.connectSse();
    } catch (e) {
      this.handleSseError(e);
      return;
    }

    this.fetchInventoryStatus();
    this.fetchLastInventorySuccess();
    this.refreshOzon();
    this.fetchLastOzonSuccess();
    this.fetchLastInventoryRun();
    this.fetchLastOzonRun();
  }

  retry(): void {
    this.retryNow();
  }

  start(): void {
    if (!this.es || this.es.readyState === EventSource.CLOSED) {
      this.connectSse();
    }
  }

  checkInitialStatus(): void {
    this.start();
    this.fetchInventoryStatus();
    this.fetchLastInventorySuccess();
    this.refreshOzon();
    this.fetchLastOzonSuccess();
    this.fetchLastInventoryRun();
    this.fetchLastOzonRun();
    this.fetchKnownWarehouses(); // NEW
  }

  refreshRunStates(): void {
    this.fetchLastInventoryRun();
    this.fetchLastOzonRun();
  }

  // ==========================================================================
  // API-запросы
  // ==========================================================================
  private fetchInventoryStatus(): void {
    this.http.get<InventoryPullEvent | null>('/api/1c/inventory-pulls/status').subscribe({
      next: (resp) => {
        if (!resp) return;
        if (!('stage' in resp) || (resp as any).stage === null) {
          const p = this.inventoryPull();
          if (p && p.status === 'running' && !this.inventoryJobId()) {
            this.inventoryPull.set(null);
          }
          return;
        }
        this.applyInventoryPullEvent(resp, { ignoreJobFilter: true });
      },
      error: (e) => {
        console.debug('[InventoryPull] status not available', e?.status);
      },
    });
  }

  private fetchLastInventorySuccess(): void {
    this.http.get<LastSyncRun>('/api/sync/last-success?source=inventory_pull').subscribe({
      next: (resp) => {
        if (resp?.found) this.lastInventorySync.set(resp);
        else this.lastInventorySync.set(null);
      },
      error: (e) => {
        console.debug('[sync] last-success inventory unavailable', e?.status);
      },
    });
  }

  private fetchLastOzonSuccess(): void {
    this.http.get<LastSyncRun>('/api/sync/last-success?source=ozon').subscribe({
      next: (resp) => {
        if (resp?.found) this.lastOzonSync.set(resp);
        else this.lastOzonSync.set(null);
      },
      error: (e) => {
        console.debug('[sync] last-success ozon unavailable', e?.status);
      },
    });
  }

  private fetchLastInventoryRun(): void {
    this.http.get<LastSyncRun>('/api/sync/last-run?source=inventory_pull').subscribe({
      next: (resp) => {
        if (!resp?.found) {
          this.inventoryInterrupted.set(null);
          return;
        }
        const errLower = (resp.error ?? '').toLowerCase();
        const isInterrupted =
          resp.status === 'interrupted' ||
          (resp.status === 'failed' &&
            (errLower.includes('restart') ||
              errLower.includes('interrupt') ||
              errLower.includes('timeout') ||
              errLower.includes('http 0') ||
              errLower.includes('connection') ||
              errLower.includes('network')));

        this.inventoryInterrupted.set(isInterrupted ? resp : null);
      },
      error: (e) => {
        console.debug('[sync] last-run inventory unavailable', e?.status);
      },
    });
  }

  private fetchLastOzonRun(): void {
    this.http.get<LastSyncRun>('/api/sync/last-run?source=ozon').subscribe({
      next: (resp) => {
        if (!resp?.found) {
          this.ozonInterrupted.set(null);
          return;
        }
        const errLower = (resp.error ?? '').toLowerCase();
        const isInterrupted =
          resp.status === 'interrupted' ||
          (resp.status === 'failed' &&
            (errLower.includes('restart') ||
              errLower.includes('interrupt') ||
              errLower.includes('timeout') ||
              errLower.includes('connection') ||
              errLower.includes('network')));

        this.ozonInterrupted.set(isInterrupted ? resp : null);
      },
      error: (e) => {
        console.debug('[sync] last-run ozon unavailable', e?.status);
      },
    });
  }

  // === NEW: склады ===
  fetchKnownWarehouses(): void {
    this.warehousesLoading.set(true);
    this.http.get<{ items: WarehouseOption[] }>('/api/warehouses/known').subscribe({
      next: (resp) => {
        this.knownWarehouses.set(resp?.items ?? []);
        this.warehousesLoading.set(false);
      },
      error: (e) => {
        console.warn('[warehouses] load failed', e);
        this.warehousesLoading.set(false);
      },
    });
  }

  setWarehouseEnabled(warehouseId: string, enabled: boolean): void {
    const url =
      `/api/warehouses/allowed?warehouse_id=${encodeURIComponent(warehouseId)}` +
      `&enabled=${enabled ? 1 : 0}`;
    this.http.post(url, {}).subscribe({
      next: () => this.fetchKnownWarehouses(),
      error: (e) => console.warn('[warehouses] toggle failed', e),
    });
  }

  enableAllWarehouses(): void {
    const list = this.knownWarehouses();
    list.forEach((w) => {
      if (!w.enabled) this.setWarehouseEnabled(w.warehouse_id, true);
    });
  }

  disableAllWarehouses(): void {
    const list = this.knownWarehouses();
    list.forEach((w) => {
      if (w.enabled) this.setWarehouseEnabled(w.warehouse_id, false);
    });
  }

  // ==========================================================================
  // job_id
  // ==========================================================================
  private saveJobId(id: string | null): void {
    this.inventoryJobId.set(id);
    try {
      if (id) sessionStorage.setItem(this._jobStorageKey, id);
      else sessionStorage.removeItem(this._jobStorageKey);
    } catch {}
  }

  private restoreJobId(): void {
    try {
      const saved = sessionStorage.getItem(this._jobStorageKey);
      if (saved) this.inventoryJobId.set(saved);
    } catch {}
  }

  // ==========================================================================
  // Ozon
  // ==========================================================================
  refreshOzon(): void {
    this.http.get<SyncProgress>('/ozon/progress').subscribe({
      next: (p) => this.upsertProgress({ ...p, source: 'ozon' }),
      error: (e) => console.warn('[Fallback] /ozon/progress failed', e),
    });
  }

  refreshAll(): void {
    this.refreshOzon();
    this.fetchInventoryStatus();
    this.fetchLastInventorySuccess();
    this.fetchLastOzonSuccess();
    this.fetchLastInventoryRun();
    this.fetchLastOzonRun();
  }

  startOzon(full = false): void {
    const url = full ? '/ozon/sync-full' : '/ozon/sync';
    this.setLocalRunning('ozon');

    this.http.post(url, {}).subscribe({
      next: () => this.refreshOzon(),
      error: (e) => {
        if (e?.status === 409) {
          console.warn('[Ozon] already running (409)');
          this.refreshOzon();
          return;
        }
        this.setLocalStopped('ozon');
        this.lastError.set({
          type: 'http',
          message: this.errMessage(e?.error?.message ?? e?.message ?? e),
          status: e?.status,
          timestamp: new Date(),
        });
      },
    });
  }

  stopOzon(): void {
    this.setLocalStopped('ozon');
    this.http.post('/ozon/stop', {}).subscribe({
      next: () => this.refreshOzon(),
      error: (e) => {
        this.lastError.set({
          type: 'http',
          message: this.errMessage(e?.error?.message ?? e?.message ?? e),
          timestamp: new Date(),
        });
      },
    });
  }

  // ==========================================================================
  // inventory_pull
  // ==========================================================================
  startInventoryPull(): void {
    const url = `/api/1c/inventory-pulls`;

    this.inventoryJobId.set(null);
    try {
      sessionStorage.removeItem(this._jobStorageKey);
    } catch {}

    this.lastError.set(null);
    this.lastInventorySync.set(null);
    this.inventoryInterrupted.set(null);
    this.inventoryStages.set(
      this._inventoryStageDefs.map((s) => ({
        ...s,
        status: 'pending' as InventoryStageStatus,
        detail: '',
      })),
    );
    this.inventoryPull.set({
      source: 'inventory_pull',
      processed: 0,
      total: 0,
      percent: 0,
      status: 'running',
      running: true,
    });

    this.http.post<{ status: string; job_id: string }>(url, {}).subscribe({
      next: (resp) => {
        this.saveJobId(resp.job_id);
        console.log('[InventoryPull] started job', resp.job_id);
      },
      error: (e) => {
        if (e?.status === 409) {
          console.warn('[InventoryPull] already running (409)');
          return;
        }
        this.inventoryPull.update((p) => (p ? { ...p, status: 'failed', running: false } : p));
        this.inventoryStages.update((list) =>
          list.map((s) =>
            s.status === 'running' ? { ...s, status: 'failed' as InventoryStageStatus } : s,
          ),
        );
        this.lastError.set({
          type: 'http',
          message: this.errMessage(e?.error?.message ?? e?.message ?? e),
          status: e?.status,
          timestamp: new Date(),
        });
      },
    });
  }

  stopInventoryPull(): void {
    this.http.post('/api/1c/inventory-pulls/stop', {}).subscribe({
      next: () => console.log('[InventoryPull] stopped'),
      error: (e) => console.warn('[InventoryPull] stop failed', e),
    });
  }

  resetAllProgress(): void {
    this.lastError.set(null);
    this.ozonProgress.set(null);
    this.inventoryPull.set(null);
    this.saveJobId(null);
    this.inventoryStages.set([]);
    this.lastInventorySync.set(null);
    this.lastOzonSync.set(null);
    this.inventoryInterrupted.set(null);
    this.ozonInterrupted.set(null);
    this.progress.set(null);
    this.progressList.set([]);
  }

  resetAllProgressAndStart(): void {
    this.resetAllProgress();

    this.http.post('/api/sync/reset', {}).subscribe({
      next: () => this.startInventoryPull(),
      error: (e) => {
        console.warn('[reset] server reset failed, starting anyway', e);
        this.startInventoryPull();
      },
    });
  }

  startAll(): void {
    if (this.canEditOzon()) this.startOzon(false);
  }

  stopAll(): void {
    if (this.isOzonRunning()) this.stopOzon();
  }

  // ==========================================================================
  // Локальный UI
  // ==========================================================================
  setLocalRunning(source: 'ozon'): void {
    const current = this.ozonProgress();
    this.upsertProgress({
      source,
      processed: current?.processed ?? 0,
      total: current?.total ?? 0,
      percent: current?.percent ?? 0,
      status: 'running',
      running: true,
    });
  }

  setLocalStopped(source: 'ozon'): void {
    const current = this.ozonProgress();
    this.upsertProgress({
      source,
      processed: current?.processed ?? 0,
      total: current?.total ?? 0,
      percent: current?.percent ?? 0,
      status: 'stopped',
      running: false,
    });
  }

  clearProgress(): void {
    this.progress.set(null);
    this.progressList.set([]);
    this.ozonProgress.set(null);
    this.inventoryPull.set(null);
    this.saveJobId(null);
    this.inventoryStages.set([]);
    this.lastInventorySync.set(null);
    this.lastOzonSync.set(null);
    this.inventoryInterrupted.set(null);
    this.ozonInterrupted.set(null);
  }

  disconnect(): void {
    if (this.es) {
      this.es.close();
      this.es = undefined;
    }
    this.status.set('closed');
    this.pageState.set('checking');
  }

  // ==========================================================================
  // Прогресс
  // ==========================================================================
  private normalize(p: SyncProgress, fallbackSource: string): SyncProgress {
    return {
      source: p.source || fallbackSource,
      processed: p.processed ?? 0,
      total: p.total ?? 0,
      percent: p.percent ?? 0,
      status: p.status || 'idle',
      running: p.running ?? p.status === 'running',
      error: (p as any).error,
      job_id: (p as any).job_id,
    };
  }

  private upsertProgress(p: SyncProgress): void {
    const src = (p.source ?? '').trim().toLowerCase();

    if (src === 'inventory_pull') {
      this.inventoryPull.set(this.normalize(p, 'inventory_pull'));
      return;
    }

    if (src !== 'ozon') return;

    const normalized = this.normalize(p, src);

    const list = this.progressList();
    const idx = list.findIndex((x) => x.source === normalized.source);

    if (idx >= 0) {
      const updated = [...list];
      updated[idx] = normalized;
      this.progressList.set(updated);
    } else {
      this.progressList.set([...list, normalized]);
    }

    if (normalized.source === 'ozon') this.ozonProgress.set(normalized);
    this.progress.set(normalized);

    if (normalized.source === 'ozon') {
      if (normalized.status === 'running') {
        this.lastError.set(null);
        this.ozonInterrupted.set(null);
      }

      if (normalized.status === 'done') {
        this.fetchLastOzonSuccess();
        this.ozonInterrupted.set(null);
        this.lastError.set(null);
      }

      if (normalized.status === 'failed') {
        if (normalized.error) {
          this.lastError.set({
            type: 'http',
            message: this.errMessage(normalized.error),
            timestamp: new Date(),
          });
        }
        this.fetchLastOzonRun();
      }
    }
  }

  // ==========================================================================
  // inventory_pull event
  // ==========================================================================
  private applyInventoryPullEvent(
    data: InventoryPullEvent,
    opts: { ignoreJobFilter?: boolean } = {},
  ): void {
    if (!opts.ignoreJobFilter) {
      const knownJob = this.inventoryJobId();
      if (knownJob && data.job_id && data.job_id !== knownJob) {
        const cur = this.inventoryPull();
        const isTerminal = cur?.status === 'done' || cur?.status === 'failed';
        if (!isTerminal) return;
      }
    }

    if (data.job_id) this.saveJobId(data.job_id);

    if (this.inventoryStages().length === 0) {
      this.inventoryStages.set(
        this._inventoryStageDefs.map((s) => ({
          ...s,
          status: 'pending',
          detail: '',
        })),
      );
    }

    const isDone = data.stage === 'done' || data.status === 'done' || data.status === 'imported';
    const isFailed = data.stage === 'error' || data.status === 'failed';

    if (isFailed) {
      this.inventoryPull.set({
        source: 'inventory_pull',
        processed: 0,
        total: 0,
        percent: 0,
        status: 'failed',
        running: false,
      });
      this.inventoryStages.update((list) =>
        list.map((s) =>
          s.status === 'done' ? s : { ...s, status: 'failed' as InventoryStageStatus },
        ),
      );

      const errLower = (data.error ?? '').toLowerCase();
      if (
        errLower.includes('restart') ||
        errLower.includes('interrupt') ||
        errLower.includes('timeout') ||
        errLower.includes('http 0') ||
        errLower.includes('connection') ||
        errLower.includes('network')
      ) {
        this.inventoryInterrupted.set({
          found: true,
          status: 'interrupted',
          error: data.error,
          finished_at: new Date().toISOString(),
        });
        this.lastError.set(null);
      } else {
        this.lastError.set({
          type: 'http',
          message: this.errMessage(data.error),
          timestamp: new Date(),
        });
      }
      return;
    }

    if (isDone) {
      const processed =
        data.stocks_accepted ?? data.accepted ?? data.current ?? data.normalized ?? 0;
      const total = data.stocks ?? data.normalized ?? data.total ?? processed;

      this.inventoryPull.set({
        source: 'inventory_pull',
        processed,
        total,
        percent: data.percent ?? 100,
        status: 'done',
        running: false,
      });

      this.inventoryStages.update((list) =>
        list.map((s) => ({
          ...s,
          status: 'done' as InventoryStageStatus,
          detail: s.key === 'done' ? '' : s.detail,
        })),
      );

      this.fetchLastInventorySuccess();
      this.inventoryInterrupted.set(null);
      this.lastError.set(null);
      return;
    }

    const processed = data.stocks_accepted ?? data.accepted ?? data.current ?? data.normalized ?? 0;
    const total = data.stocks ?? data.normalized ?? data.total ?? 0;

    this.inventoryPull.set({
      source: 'inventory_pull',
      processed,
      total,
      percent: data.percent ?? 0,
      status: 'running',
      running: true,
    });

    this.lastError.set(null);
    this.inventoryInterrupted.set(null);

    let stageKey = data.stage as string;
    if (
      stageKey === 'read' ||
      stageKey === 'normalize' ||
      stageKey === 'migrate' ||
      stageKey === 'start'
    ) {
      stageKey = 'catalog';
    }

    const order = this._stageOrder;
    const idx = order.indexOf(stageKey);

    this.inventoryStages.update((list) =>
      list.map((s) => {
        const sIdx = order.indexOf(s.key);
        let status: InventoryStageStatus = s.status;

        if (idx >= 0 && sIdx >= 0) {
          if (sIdx < idx) status = 'done';
          else if (sIdx === idx) status = 'running';
          else status = 'pending';
        }

        const newDetail = sIdx === idx ? this.describeStage(data.stage, data) : s.detail;

        return { ...s, status, detail: newDetail };
      }),
    );
  }

  // ==========================================================================
  // Детали этапа
  // ==========================================================================
  private describeStage(stage: string, data: InventoryPullEvent): string {
    const parts: string[] = [];

    const push = (key: keyof InventoryPullEvent, label: string) => {
      const v = (data as any)[key];
      if (v !== undefined && v !== null && v !== 0) {
        parts.push(`${label}: ${v}`);
      }
    };

    switch (stage) {
      case 'catalog':
      case 'read':
      case 'normalize':
      case 'migrate':
      case 'start':
        push('accepted', 'принято');
        push('conflicts', 'конфликтов');
        push('migrated', 'мигрировано');
        break;

      case 'ka2_pull':
        push('warehouses', 'складов');
        push('analytics', 'аналитик');
        push('stocks', 'остатков');
        push('costs', 'себес');
        push('suppliers', 'поставщиков');
        push('warnings', 'warnings');
        break;

      case 'save':
        push('stocks_accepted', 'записано остатков');
        push('costs_accepted', 'записано себес');
        break;

      case 'done':
        break;

      default:
        push('accepted', 'принято');
        push('conflicts', 'конфликтов');
        push('migrated', 'мигрировано');
        push('warehouses', 'складов');
        push('stocks', 'остатков');
        push('costs', 'себес');
        push('stocks_accepted', 'записано остатков');
        push('costs_accepted', 'записано себес');
    }

    return parts.join(', ');
  }

  ngOnDestroy(): void {
    if (this.es) {
      this.es.close();
      this.es = undefined;
    }
  }
}
