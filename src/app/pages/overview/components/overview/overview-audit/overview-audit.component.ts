import { Component, OnInit, signal, Input } from '@angular/core';

export interface AuditLog {
  id: number;
  entity: string;
  direction: string;
  status: 'error' | 'success' | 'warning';
  error: string;
  timestamp: string;
}

@Component({
  selector: 'app-overview-audit',
  standalone: false,
  templateUrl: './overview-audit.component.html',
  styleUrls: ['./overview-audit.component.scss']
})
export class OverviewAuditComponent implements OnInit {
  @Input() logs: AuditLog[] = [];

  auditLogs = signal<AuditLog[]>([]);
  currentSortColumn = signal<keyof AuditLog | null>('timestamp');
  isAscending = signal<boolean>(false);

  ngOnInit(): void {
    if (this.logs.length === 0) {
      this.auditLogs.set([
        { id: 1, entity: 'order_action', direction: '1С → маркетплейс', status: 'error', error: 'Маркетплейс 400 на /v4/posting/fbs/ship: POSTING_ALREADY_SHIPPED', timestamp: '25.08.2026, 18:45:38' },
        { id: 2, entity: 'stocks', direction: '1С → маркетплейс', status: 'error', error: '2 ошибок', timestamp: '25.08.2026, 18:06:18' },
        { id: 3, entity: 'order_label', direction: 'Маркетплейс → 1С', status: 'error', error: 'Этикетки не сгенерированы за 30с. Последняя ошибка: Маркетплейс 400 на /packa', timestamp: '23.08.2026, 18:05:16' },
        { id: 4, entity: '1c_connection', direction: '1С → маркетплейс', status: 'error', error: '1С не ответила за 20 секунд.', timestamp: '14.08.2026, 23:53:39' },
        { id: 5, entity: '1c_connection', direction: '1С → маркетплейс', status: 'error', error: '1С не приняла логин или пароль.', timestamp: '09.08.2026, 14:46:03' }
      ]);
    } else {
      this.auditLogs.set([...this.logs]);
    }
  }

  sort(column: keyof AuditLog): void {
    if (this.currentSortColumn() === column) {
      this.isAscending.update(val => !val);
    } else {
      this.currentSortColumn.set(column);
      this.isAscending.set(true);
    }

    const direction = this.isAscending() ? 1 : -1;

    this.auditLogs.update(currentLogs => {
      return [...currentLogs].sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
      });
    });
  }
}
