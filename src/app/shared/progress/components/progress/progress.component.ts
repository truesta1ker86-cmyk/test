import { Component, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProgressService } from '../../../sse/service/progress.service';

@Component({
  selector: 'app-progress',
  standalone: false,
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
})
export class ProgressComponent {
  progress = inject(ProgressService);
  private http = inject(HttpClient);

  readonly isStartingOzon = signal(false);
  readonly isStartingOnec = signal(false);
  readonly isStoppingOzon = signal(false);
  readonly isStoppingOnec = signal(false);
  readonly isRefreshing   = signal(false);

  readonly canStartOzon = computed(() =>
    this.progress.serviceReady() &&
    !this.isStartingOzon() &&
    !this.progress.isOzonRunning()
  );

  readonly canStartOnec = computed(() =>
    this.progress.serviceReady() &&
    !this.isStartingOnec() &&
    !this.progress.isOnecRunning()
  );

  // -------------------------------------------------------------------------
  // Ручное обновление
  // -------------------------------------------------------------------------
  refresh(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);

    this.progress.retryNow();

    setTimeout(() => this.isRefreshing.set(false), 500);
  }

  // -------------------------------------------------------------------------
  // Ozon
  // -------------------------------------------------------------------------
  startOzonSync(): void {
    if (!this.canStartOzon()) return;
    this.isStartingOzon.set(true);

    this.http.post('/ozon/sync', {}).subscribe({
      next: () => {
        this.isStartingOzon.set(false);
        this.progress.setLocalRunning('ozon');   // ← мгновенный UI
      },
      error: () => this.isStartingOzon.set(false),
    });
  }

  stopOzonSync(): void {
    if (this.isStoppingOzon()) return;
    this.isStoppingOzon.set(true);

    this.http.post('/ozon/stop', {}).subscribe({
      next: () => {
        this.progress.setLocalStopped('ozon');   // ← мгновенный UI
        setTimeout(() => this.isStoppingOzon.set(false), 1000);
      },
      error: () => this.isStoppingOzon.set(false),
    });
  }

  // -------------------------------------------------------------------------
  // 1С
  // -------------------------------------------------------------------------
  startOnecSync(): void {
    if (!this.canStartOnec()) return;
    this.isStartingOnec.set(true);

    this.http.post('/onec/sync', {}).subscribe({
      next: () => {
        this.isStartingOnec.set(false);
        this.progress.setLocalRunning('onec');   // ← мгновенный UI
      },
      error: () => this.isStartingOnec.set(false),
    });
  }

  startOnecFullSync(): void {
    if (!this.canStartOnec()) return;
    if (!confirm('Сбросить чекпоинт 1С и синхронизировать заново?')) return;

    this.isStartingOnec.set(true);

    this.http.post('/onec/sync/full', {}).subscribe({
      next: () => {
        this.isStartingOnec.set(false);
        this.progress.setLocalRunning('onec');   // ← мгновенный UI
      },
      error: () => this.isStartingOnec.set(false),
    });
  }

  stopOnecSync(): void {
    if (this.isStoppingOnec()) return;
    this.isStoppingOnec.set(true);

    this.http.post('/onec/stop', {}).subscribe({
      next: () => {
        this.progress.setLocalStopped('onec');   // ← мгновенный UI
        setTimeout(() => this.isStoppingOnec.set(false), 1000);
      },
      error: () => this.isStoppingOnec.set(false),
    });
  }

  // -------------------------------------------------------------------------
  // UI-хелперы
  // -------------------------------------------------------------------------
  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'done':    return 'success';
      case 'running': return 'info';
      case 'stopped': return 'warn';
      case 'failed':
      case 'error':   return 'danger';
      default:        return 'secondary';
    }
  }

  progressLabel(source: 'ozon' | 'onec'): string {
    const p = source === 'ozon'
      ? this.progress.ozonProgress()
      : this.progress.onecProgress();
    if (!p) return 'Нет данных';
    return `${p.processed ?? 0} / ${p.total ?? 0} (${(p.percent ?? 0).toFixed(1)}%)`;
  }

  progressValue(source: 'ozon' | 'onec'): number {
    const p = source === 'ozon'
      ? this.progress.ozonProgress()
      : this.progress.onecProgress();
    return p?.percent ?? 0;
  }

  retry(): void {
    this.progress.retryNow();
  }
}