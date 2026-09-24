import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';

import {
  ProgressService,
  SyncProgress,
  InventoryStageStatus,
} from '../../../sse/service/progress.service';


@Component({
  selector: 'app-progress',
  standalone: false,
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent implements OnInit, OnDestroy {
  readonly svc = inject(ProgressService);

  private _pollInterval?: ReturnType<typeof setInterval>;

  // === NEW: склады ===
  warehousesExpanded = false;

  ngOnInit(): void {
    this.svc.start();
    this.svc.checkInitialStatus();

    this._pollInterval = setInterval(() => {
      if (!this.svc.anyRunning()) {
        this.svc.refreshRunStates();
      }
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = undefined;
    }
  }

  // -----------------------------------------------------------
  // Действия
  // -----------------------------------------------------------
  onStartOzon()     { this.svc.startOzon(false); }
  onStartFullOzon() { this.svc.startOzon(true); }
  onStopOzon()      { this.svc.stopOzon(); }

  onStartAll() { this.svc.startAll(); }
  onStopAll()  { this.svc.stopAll(); }

  onRetrySse() { this.svc.retryNow(); }
  onRefresh()  { this.svc.refreshAll(); }

  // -----------------------------------------------------------
  // inventory_pull
  // -----------------------------------------------------------
  onStartInventoryPull(): void {
    this.svc.startInventoryPull();
  }

  onStartInventoryPullAll(): void {
    this.svc.resetAllProgressAndStart();
  }

  onResumeInventoryPull(): void {
    this.svc.inventoryInterrupted.set(null);
    this.svc.startInventoryPull();
  }

  onDismissInterrupted(): void {
    this.svc.inventoryInterrupted.set(null);
    this.svc.ozonInterrupted.set(null);
  }

  // === NEW: склады ===
  toggleWarehousesPanel(): void {
    this.warehousesExpanded = !this.warehousesExpanded;
    if (this.warehousesExpanded) {
      this.svc.fetchKnownWarehouses();
    }
  }

  onToggleWarehouse(id: string, enabled: boolean): void {
    this.svc.setWarehouseEnabled(id, enabled);
  }

  onEnableAllWarehouses(): void { this.svc.enableAllWarehouses(); }
  onDisableAllWarehouses(): void { this.svc.disableAllWarehouses(); }

  inventoryPercent(): number {
    const p = this.svc.inventoryPull();
    if (p?.percent != null && p.percent > 0) {
      return Math.max(0, Math.min(100, Math.round(p.percent)));
    }

    const stages = this.svc.inventoryStages() ?? [];
    if (!stages.length) return 0;

    const total = stages.length;
    const done = stages.reduce(
      (acc: number, s: { status: InventoryStageStatus }) =>
        acc + ((s.status === 'done' || s.status === 'failed') ? 1 : 0),
      0,
    );
    return Math.round((done / total) * 100);
  }

  inventoryStageClass(status: InventoryStageStatus): string {
    switch (status) {
      case 'running': return 'stage-running';
      case 'done':    return 'stage-done';
      case 'failed':  return 'stage-failed';
      default:        return 'stage-pending';
    }
  }

  formatLastSyncDate(iso?: string): string {
    if (!iso) return '—';

    let norm = iso.trim().replace(' ', 'T');
    norm = norm.replace(/([+-]\d{2})$/, '$1:00');
    norm = norm.replace(/(\.\d{3})\d+/, '$1');

    if (!/Z$/.test(norm) && !/[+-]\d{2}:\d{2}$/.test(norm)) {
      norm = norm + 'Z';
    }

    const d = new Date(norm);
    if (isNaN(d.getTime())) return iso;

    const pad = (n: number) => String(n).padStart(2, '0');

    const day    = pad(d.getUTCDate());
    const month  = pad(d.getUTCMonth() + 1);
    const year   = d.getUTCFullYear();
    const hours  = pad(d.getUTCHours());
    const mins   = pad(d.getUTCMinutes());

    return `${day}.${month}.${year} ${hours}:${mins}`;
  }

  // -----------------------------------------------------------
  // Вспомогательные
  // -----------------------------------------------------------
  statusLabel(s: string): string {
    const map: Record<string, string> = {
      idle: 'ожидание',
      running: 'в процессе',
      stopping: 'останавливается',
      stopped: 'остановлено',
      done: 'завершено',
      imported: 'завершено',
      failed: 'ошибка',
      interrupted: 'прервано',
    };
    return map[s] ?? s;
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      idle: '',
      running: 'is-running',
      stopping: 'is-stopping',
      stopped: 'is-stopped',
      done: 'is-done',
      imported: 'is-done',
      failed: 'is-error',
      interrupted: 'is-stopped',
    };
    return map[s] ?? '';
  }

  statusIcon(s: string): string {
    const map: Record<string, string> = {
      idle: 'pi pi-clock',
      running: 'pi pi-spin pi-spinner',
      stopping: 'pi pi-spin pi-spinner',
      stopped: 'pi pi-pause-circle',
      done: 'pi pi-check-circle',
      imported: 'pi pi-check-circle',
      failed: 'pi pi-times-circle',
      interrupted: 'pi pi-exclamation-triangle',
    };
    return map[s] ?? 'pi pi-clock';
  }

  percent(p: SyncProgress | null): number {
    if (!p) return 0;
    return Math.max(0, Math.min(100, p.percent ?? 0));
  }

  trackBySource = (_: number, p: SyncProgress) => p.source;
}