import { Injectable, NgZone, signal, computed, OnDestroy } from '@angular/core';

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'failed';

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

@Injectable({ providedIn: 'root' })
export class EventsService implements OnDestroy {
  private es?: EventSource;

  // --- Состояние SSE ---
  readonly status = signal<SseStatus>('idle');
  readonly retryCount = signal(0);
  readonly lastError = signal<string | null>(null);

  // --- Данные из потока ---
  readonly progress = signal<SyncProgress | null>(null);
  readonly lastHook = signal<HookEntry | null>(null);

  // --- Производные ---
  readonly connected = computed(() => this.status() === 'open');
  readonly percent = computed(() => this.progress()?.percent ?? 0);
  readonly processed = computed(() => this.progress()?.processed ?? 0);
  readonly total = computed(() => this.progress()?.total ?? 0);
  readonly isRunning = computed(() => this.progress()?.status === 'running');

  constructor(private zone: NgZone) {
    this.connect();
  }

  private connect(): void {
    this.status.set('connecting');

    // Относительный путь — Angular dev-server проксирует на C++ (8090)
    this.es = new EventSource('/events/subscribe');

    this.es.onopen = () => {
      this.zone.run(() => {
        this.status.set('open');
        this.retryCount.set(0);
        this.lastError.set(null);
      });
    };

    this.es.onerror = () => {
      this.zone.run(() => {
        if (this.es?.readyState === EventSource.CONNECTING) {
          this.status.set('reconnecting');
          this.retryCount.update((n) => n + 1);
        } else {
          this.status.set('failed');
        }
        this.lastError.set('SSE connection error');
      });
    };

    // --- Событие "init" — начальное состояние ---
    this.es.addEventListener('init', (event: MessageEvent) => {
      this.zone.run(() => {
        try {
          const data = JSON.parse(event.data);
          // Можно сохранить последние хуки, если нужно
          // this.hooks.set(data.items ?? []);
        } catch (e) {
          console.error('SSE init parse error', e);
        }
      });
    });

    // --- Событие "progress" — прогресс синхронизации Ozon ---
    this.es.addEventListener('progress', (event: MessageEvent) => {
      this.zone.run(() => {
        try {
          const data: SyncProgress = JSON.parse(event.data);
          this.progress.set(data);
        } catch (e) {
          console.error('SSE progress parse error', e);
        }
      });
    });

    // --- Событие "hook" — новый вебхук ---
    this.es.addEventListener('hook', (event: MessageEvent) => {
      this.zone.run(() => {
        try {
          const data: HookEntry = JSON.parse(event.data);
          this.lastHook.set(data);
        } catch (e) {
          console.error('SSE hook parse error', e);
        }
      });
    });

    // --- Событие "cleared" — буфер хуков очищен ---
    this.es.addEventListener('cleared', () => {
      this.zone.run(() => {
        this.lastHook.set(null);
      });
    });
  }

  /**
   * Ручной перезапуск соединения.
   */
  reconnect(): void {
    this.es?.close();
    this.status.set('idle');
    this.retryCount.set(0);
    this.connect();
  }

  ngOnDestroy(): void {
    this.es?.close();
    this.status.set('closed');
  }
}
