import {
  STOCK_RUN_PANEL_TABLE_COLUMNS1,
  STOCK_RUN_PANEL_SOURCES,
} from './infrastructure/constants/stock-run-preview.constants';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type {
  StockRunPreview,
  StockWarehouse,
} from '../../infrastructure/interfaces/contracts.interfaces';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-stock-run-preview',

  templateUrl: './stock-run-preview.component.html',
  styles: `
    :host {
      display: block;
      scroll-margin-top: 76px;
    }
    .run-panel {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
    }
    header {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: start;
    }
    h2 {
      font-size: 16px;
      margin: 0 0 8px;
    }
    p {
      font-size: 12px;
      color: var(--muted);
      margin: 0 0 14px;
      line-height: 1.6;
    }
    .run-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 12px;
      margin: 16px 0;
    }
    .run-mode {
      background: var(--brand-soft);
      color: var(--brand);
      border-radius: 8px;
      padding: 10px 12px;
    }
    :host ::ng-deep .run-table {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    :host ::ng-deep table {
      width: 100%;
      min-width: 850px;
      border-collapse: collapse;
      font-size: 12px;
    }
    :host ::ng-deep th,
    :host ::ng-deep td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    :host ::ng-deep th {
      background: var(--surface-2);
      white-space: nowrap;
      font-weight: 550;
    }
    :host ::ng-deep td:first-child {
      min-width: 220px;
      max-width: 300px;
    }
    small {
      display: block;
      font-size: 10px;
      color: var(--muted);
      margin-top: 4px;
    }
    @media (max-width: 720px) {
      .run-panel {
        padding: 14px;
      }
      header {
        flex-wrap: wrap;
      }
    }
  `,
})
export class StockRunPanel {
  tableColumns1(): DataTableColumn[] {
    return STOCK_RUN_PANEL_TABLE_COLUMNS1;
  }

  readonly plan = input.required<StockRunPreview>();
  readonly warehouses = input<StockWarehouse[]>([]);
  readonly close = output<void>();
  readonly page = signal(1);
  readonly size = signal(100);
  readonly rows = computed(() =>
    this.plan().items.slice((this.page() - 1) * this.size(), this.page() * this.size()),
  );
  readonly sources: Record<string, string> = STOCK_RUN_PANEL_SOURCES;
  warehouseName(id: string | null) {
    return (
      this.warehouses().find((row) => row.warehouse_id === id)?.warehouse_name || id || 'Все склады'
    );
  }
}
