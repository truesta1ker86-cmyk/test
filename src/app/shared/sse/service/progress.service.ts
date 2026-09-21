import { Injectable, NgZone, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'failed';
export type PageState = 'checking' | 'ready' | 'failed' | 'reconnecting';

export interface SyncProgress {
  source: string;
  processed: number;
  total: number;
  percent: number;
  status: string;
  running?: boolean;
}

export interface SseError {
  type: 'offline' | 'network' | 'timeout' | 'http' | 'auth' | 'parse' | 'max-retries' | 'unknown';
  message: string;
  status?: number;
  attempt?: number;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ProgressService implements OnDestroy {
  private zone = inject(NgZone);
  private http = inject(HttpClient);

  // -------------------------------------------------------------------------
  // SSE
  // -------------------------------------------------------------------------
  readonly status      = signal<SseStatus>('idle');
  readonly retryCount$ = signal(0);
  readonly lastError   = signal<SseError | null>(null);

  private es?: EventSource;

  // -------------------------------------------------------------------------
  // Страница
  // -------------------------------------------------------------------------
  readonly pageState = signal<PageState>('checking');

  // -------------------------------------------------------------------------
  // Прогресс
  // -------------------------------------------------------------------------
  readonly progress     = signal<SyncProgress | null>(null);
  readonly progressList = signal<SyncProgress[]>([]);
  readonly ozonProgress = signal<SyncProgress | null>(null);
  readonly onecProgress = signal<SyncProgress | null>(null);

  // -------------------------------------------------------------------------
  // Оверлей
  // -------------------------------------------------------------------------
  readonly overlayCollapsed = signal(false);
  collapseOverlay(): void { this.overlayCollapsed.set(true); }
  expandOverlay(): void   { this.overlayCollapsed.set(false); }

  // -------------------------------------------------------------------------
  // Производные
  // -------------------------------------------------------------------------
  readonly connected    = computed(() => this.status() === 'open');
  readonly isHealthy    = computed(() =>
    this.status() === 'open' || this.status() === 'reconnecting');
  readonly online       = computed(() =>
    this.status() !== 'failed' && this.status() !== 'closed');
  readonly reconnecting = computed(() => this.status() === 'reconnecting');
  readonly serviceReady = computed(() => this.pageState() === 'ready');

  readonly isOzonRunning = computed(() =>
    this.ozonProgress()?.status === 'running' || this.ozonProgress()?.running === true);
  readonly isOnecRunning = computed(() =>
    this.onecProgress()?.status === 'running' || this.onecProgress()?.running === true);
  readonly anyRunning    = computed(() => this.isOzonRunning() || this.isOnecRunning());
  readonly canEdit       = computed(() => this.connected() && !this.anyRunning());

  // -------------------------------------------------------------------------
  // Конструктор: подключаемся к SSE
  // -------------------------------------------------------------------------
  constructor() {
    this.connectSse();
  }

  private connectSse(): void {
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
          this.retryCount$.update(n => n + 1);
          this.lastError.set({
            type: 'network',
            message: 'Потеря связи, попытка переподключения…',
            timestamp: new Date(),
          });
        } else {
          console.error('[SSE] connection failed');
          this.status.set('failed');
          this.pageState.set('failed');
          this.lastError.set({
            type: 'network',
            message: 'Соединение потеряно',
            timestamp: new Date(),
          });
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
  }

  // -------------------------------------------------------------------------
  // Публичное API
  // -------------------------------------------------------------------------

  /** Ручное переподключение */
  retryNow(): void {
    this.retryCount$.set(0);
    this.lastError.set(null);
    this.pageState.set('checking');
    this.connectSse();
  }

  retry(): void { this.retryNow(); }

  /** Запуск — вызывается из AppComponent при инициализации */
  start(): void {
    if (!this.es || this.es.readyState === EventSource.CLOSED) {
      this.connectSse();
    }
  }

  checkInitialStatus(): void {
    this.start();
  }

  /** Fallback-запрос — на случай, если SSE не работает */
  async refreshNow(): Promise<void> {
    await this.fetchStatusFallback();
  }

  async fetchStatusFallback(): Promise<void> {
    try {
      const [onec, ozon] = await Promise.all([
        firstValueFrom(this.http.get<SyncProgress>('/onec/status')).catch(() => null),
        firstValueFrom(this.http.get<SyncProgress>('/ozon/status')).catch(() => null),
      ]);

      this.zone.run(() => {
        if (onec) this.upsertProgress(this.normalize(onec, 'onec'));
        if (ozon) this.upsertProgress(this.normalize(ozon, 'ozon'));
      });
    } catch (e) {
      console.warn('[Fallback] status fetch failed', e);
    }
  }

  // -------------------------------------------------------------------------
  // Оптимистичный UI: мгновенно переключаем состояние
  // -------------------------------------------------------------------------

  /** Локально отметить источник как "running" */
  setLocalRunning(source: 'onec' | 'ozon'): void {
    const current = source === 'onec'
      ? this.onecProgress()
      : this.ozonProgress();

    const updated: SyncProgress = {
      source,
      processed: current?.processed ?? 0,
      total:     current?.total     ?? 0,
      percent:   current?.percent   ?? 0,
      status:    'running',
      running:   true,
    };

    this.upsertProgress(updated);
  }

  /** Локально отметить источник как "stopped" */
  setLocalStopped(source: 'onec' | 'ozon'): void {
    const current = source === 'onec'
      ? this.onecProgress()
      : this.ozonProgress();

    const updated: SyncProgress = {
      source,
      processed: current?.processed ?? 0,
      total:     current?.total     ?? 0,
      percent:   current?.percent   ?? 0,
      status:    'stopped',
      running:   false,
    };

    this.upsertProgress(updated);
  }

  // -------------------------------------------------------------------------
  // Утилиты
  // -------------------------------------------------------------------------
  clearProgress(): void {
    this.progress.set(null);
    this.progressList.set([]);
    this.ozonProgress.set(null);
    this.onecProgress.set(null);
  }

  disconnect(): void {
    if (this.es) {
      this.es.close();
      this.es = undefined;
    }
    this.status.set('closed');
    this.pageState.set('checking');
  }

  private normalize(p: SyncProgress, fallbackSource: string): SyncProgress {
    return {
      source:    p.source    || fallbackSource,
      processed: p.processed ?? 0,
      total:     p.total     ?? 0,
      percent:   p.percent   ?? 0,
      status:    p.status    || 'idle',
      running:   p.running   ?? (p.status === 'running'),
    };
  }

  private upsertProgress(p: SyncProgress): void {
    const normalized = this.normalize(p, p.source || 'unknown');

    const list = this.progressList();
    const idx = list.findIndex(x => x.source === normalized.source);

    if (idx >= 0) {
      const updated = [...list];
      updated[idx] = normalized;
      this.progressList.set(updated);
    } else {
      this.progressList.set([...list, normalized]);
    }

    if (normalized.source === 'ozon')      this.ozonProgress.set(normalized);
    else if (normalized.source === 'onec') this.onecProgress.set(normalized);

    this.progress.set(normalized);
  }

  ngOnDestroy(): void {
    if (this.es) {
      this.es.close();
      this.es = undefined;
    }
  }
}