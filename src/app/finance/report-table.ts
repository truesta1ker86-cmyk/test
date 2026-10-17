import { Component, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  ColumnFilterComponent,
  ColumnChange,
  ColumnRules,
} from '../shared/directives/filter-panel/filter-panel';
import { RouterLink } from '@angular/router';
import { Icon } from '../shared/icons-sprite/icons-sprite/icons-sprite.component';
import { currency, quantity } from '../workspace/format';
import {
  ProductName,
  ProductPreviewData,
} from '../shared/product-preview/directives/product-name.directive';
export interface Column {
  group?: string;
  groupLabel?: string;
  note?: string;
  key: string;
  label: string;
  format?: 'money' | 'number' | 'percent' | 'text';
}
export interface ReportRow {
  preview?: ProductPreviewData;
  cellNotes?: Record<string, string>;
  isTotal?: boolean;
  isGroup?: boolean;
  id: string;
  label: string;
  offer?: string;
  cells: Record<string, string | number | null | undefined>;
  children?: ReportRow[];
  complete?: boolean;
  note?: string;
}
@Component({
  selector: 'app-report-table',
  imports: [RouterLink, Icon, NgTemplateOutlet, ColumnFilterComponent, ProductName],
  templateUrl: './report-table.html',
  styles: `
    :host {
      display: block;
      --grid-line: var(--table-grid);
    }
    .finance-column-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .table-wrap {
      overflow: auto;
      border: 1px solid var(--grid-line);
      max-height: 72dvh;
      border-radius: var(--panel-radius);
      background: var(--surface);
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 11px;
    }
    th,
    td {
      text-align: right;
      white-space: nowrap;
      padding: 9px 12px;
      border-bottom: 1px solid var(--grid-line);
      border-right: 1px solid var(--grid-line);
      vertical-align: top;
    }
    th {
      background: var(--table-heading-bg);
      color: var(--text);
      font-weight: 650;
      position: sticky;
      top: 0;
      z-index: 3;
      height: 34px;
    }
    th.identity-column,
    td:first-child {
      text-align: left;
      min-width: 240px;
      white-space: normal;
      max-width: 400px;
      position: sticky;
      left: 0;
      background: var(--surface);
      box-shadow: inset -1px 0 var(--grid-line);
      z-index: 2;
    }
    th.identity-column {
      z-index: 5;
      background: var(--table-heading-bg);
    }
    .period-row th {
      text-align: center;
      height: 34px;
    }
    .has-groups thead tr:last-child th {
      top: 34px;
    }
    .text-cell {
      text-align: left;
    }
    th button {
      font: inherit;
      text-align: inherit;
      width: 100%;
    }
    a {
      color: var(--brand);
    }
    small {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 400;
      margin-top: 4px;
    }
    .row-label {
      display: flex;
      gap: 8px;
    }
    .expand {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      flex: none;
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--surface);
    }
    .group-row {
      font-weight: 600;
    }
    .group-row td {
      background: var(--brand-soft);
      border-bottom-width: 2px;
    }
    .child-row {
      background: var(--surface-2);
    }
    .child-row td:first-child {
      padding-left: 44px;
    }
    .incomplete {
      color: var(--amber);
    }
    .empty {
      text-align: center !important;
      padding: 40px;
      color: var(--muted);
    }
    :host([data-report-view='gross']) table,
    :host([data-report-view='weekly']) table {
      font-size: 12px;
      line-height: 1.25;
    }
    :host([data-report-view='gross']) td,
    :host([data-report-view='weekly']) td {
      height: 38px;
      padding: 6px 10px;
    }
    :host([data-report-view='gross']) th,
    :host([data-report-view='weekly']) th {
      height: 32px;
      padding: 5px 10px;
      font-size: 11px;
    }
    :host([data-report-view='gross']) .has-groups thead tr:last-child th,
    :host([data-report-view='weekly']) .has-groups thead tr:last-child th {
      top: 32px;
    }
    :host([data-report-view='operations']) table,
    :host([data-report-view='accruals']) table {
      font-size: 13px;
    }
    :host([data-report-view='operations']) th,
    :host([data-report-view='operations']) td,
    :host([data-report-view='accruals']) th,
    :host([data-report-view='accruals']) td {
      padding: 10px 14px;
    }
    :host([data-report-view='accruals']) th {
      font-size: 12px;
      min-width: 180px;
    }
  `,
})
export class ReportTable {
  readonly columnRules = input<ColumnRules>({});
  readonly columnOptions = input<Record<string, string[]>>({});
  readonly columnChanged = output<ColumnChange>();
  readonly columns = input.required<Column[]>();
  readonly rows = input.required<ReportRow[]>();
  readonly label = input('Товар / статья');
  readonly canEdit = input(false);
  readonly identityLinks = input(true);
  readonly empty = input('В выбранном периоде данных нет.');
  readonly edit = output<string>();
  readonly expanded = signal(new Set<string>());
  readonly sort = signal({ key: '', desc: false });
  readonly headerGroups = computed(() => {
    if (!this.columns().some((col) => col.group)) return [];
    const groups: { label: string; span: number }[] = [];
    for (const col of this.columns()) {
      const label = col.groupLabel || col.group || 'Итого за период';
      const last = groups.at(-1);
      if (last?.label === label) last.span++;
      else groups.push({ label, span: 1 });
    }
    return groups;
  });
  sortRows(rows: ReportRow[]) {
    const s = this.sort();
    if (!s.key) return rows;
    return [...rows].sort((a, b) => {
      if (!!a.isTotal !== !!b.isTotal) return a.isTotal ? 1 : -1;
      const x = s.key === 'label' ? a.label : a.cells[s.key],
        y = s.key === 'label' ? b.label : b.cells[s.key];
      const missing = (v: unknown) => v === null || v === undefined || v === '';
      if (missing(x) !== missing(y)) return missing(x) ? 1 : -1;
      const col = this.columns().find((c) => c.key === s.key);
      const result =
        col && col.format !== 'text'
          ? Number(x) - Number(y)
          : String(x ?? '').localeCompare(String(y ?? ''), 'ru', { numeric: true });
      return s.desc ? -result : result;
    });
  }
  readonly sorted = computed(() => this.sortRows(this.rows()));
  sortBy(key: string) {
    this.sort.update((s) => ({ key, desc: s.key === key ? !s.desc : false }));
  }
  toggle(id: string) {
    this.expanded.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  numericValue(value: unknown, col: Column) {
    return col.format === 'text' ||
      value === null ||
      value === undefined ||
      value === '' ||
      !Number.isFinite(Number(value))
      ? null
      : Number(value);
  }
  format(value: unknown, col: Column) {
    if (value === null || value === undefined || value === '') return '—';
    if (col.format === 'money') return currency(value as string);
    if (col.format === 'percent') return quantity(value as string) + ' %';
    if (col.format === 'number') return quantity(value as string);
    return String(value);
  }
}
