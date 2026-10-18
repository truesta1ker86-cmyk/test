import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { ColumnChange, ColumnRules } from '../../../../shared/directives/filter-panel/filter-panel';
import { currency, quantity } from '../../../orders/infrastructure/utils/format.utils';
import type { Column, ReportRow } from './infrastructure/interfaces/report-table.interfaces';
import {
  selectColumns,
  columnChoices,
} from '../../../../shared/filtering/infrastructure/utils/column-selection.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-report-table',

  templateUrl: './report-table.component.html',
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
    :host ::ng-deep .table-wrap {
      overflow: auto;
      border: 1px solid var(--grid-line);
      max-height: 72dvh;
      border-radius: var(--panel-radius);
      background: var(--surface);
    }
    :host ::ng-deep table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 11px;
    }
    :host ::ng-deep th,
    :host ::ng-deep td {
      text-align: right;
      white-space: nowrap;
      padding: 9px 12px;
      border-bottom: 1px solid var(--grid-line);
      border-right: 1px solid var(--grid-line);
      vertical-align: top;
    }
    :host ::ng-deep th {
      background: var(--table-heading-bg);
      color: var(--text);
      font-weight: 650;
      position: sticky;
      top: 0;
      z-index: 3;
      height: 34px;
    }
    :host ::ng-deep th.identity-column,
    :host ::ng-deep td:first-child {
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
    :host ::ng-deep th.identity-column {
      z-index: 5;
      background: var(--table-heading-bg);
    }
    :host ::ng-deep .period-row th {
      text-align: center;
      height: 34px;
    }
    :host ::ng-deep .has-groups thead tr:last-child th {
      top: 34px;
    }
    .text-cell {
      text-align: left;
    }
    :host ::ng-deep th button {
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
    :host ::ng-deep .group-row td {
      background: var(--brand-soft);
      border-bottom-width: 2px;
    }
    .child-row {
      background: var(--surface-2);
    }
    :host ::ng-deep .child-row td:first-child {
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
    :host([data-report-view='gross']) ::ng-deep table,
    :host([data-report-view='weekly']) ::ng-deep table {
      font-size: 12px;
      line-height: 1.25;
    }
    :host([data-report-view='gross']) ::ng-deep td,
    :host([data-report-view='weekly']) ::ng-deep td {
      height: 38px;
      padding: 6px 10px;
    }
    :host([data-report-view='gross']) ::ng-deep th,
    :host([data-report-view='weekly']) ::ng-deep th {
      height: 32px;
      padding: 5px 10px;
      font-size: 11px;
    }
    :host([data-report-view='gross']) ::ng-deep .has-groups thead tr:last-child th,
    :host([data-report-view='weekly']) ::ng-deep .has-groups thead tr:last-child th {
      top: 32px;
    }
    :host([data-report-view='operations']) ::ng-deep table,
    :host([data-report-view='accruals']) ::ng-deep table {
      font-size: 13px;
    }
    :host([data-report-view='operations']) ::ng-deep th,
    :host([data-report-view='operations']) ::ng-deep td,
    :host([data-report-view='accruals']) ::ng-deep th,
    :host([data-report-view='accruals']) ::ng-deep td {
      padding: 10px 14px;
    }
    :host([data-report-view='accruals']) ::ng-deep th {
      font-size: 12px;
      min-width: 180px;
    }
  `,
})
export class ReportTable {
  tableColumns1(): DataTableColumn[] {
    return [
      { field: 'column_1', header: '', cellTemplate: { slot: 'cell1' } },
      ...this.columns().flatMap((col) => [
        { field: 'column_2', header: '', cellTemplate: { slot: 'cell2', item: col } },
      ]),
      ...(this.canEdit()
        ? [{ field: 'column_3', header: 'Себестоимость', cellTemplate: { slot: 'cell3' } }]
        : []),
    ];
  }

  readonly visibleRows = computed(() => {
    const result: { row: ReportRow; depth: number }[] = [];
    const visit = (rows: ReportRow[], depth: number) => {
      for (const row of this.sortRows(rows)) {
        result.push({ row, depth });
        if (this.expanded().has(row.id) && row.children?.length) visit(row.children, depth + 1);
      }
    };
    visit(this.filteredRows(), 0);
    return result;
  });

  readonly columnRules = input<ColumnRules>({});
  readonly columnOptions = input<Record<string, string[]>>({});
  readonly columnChanged = output<ColumnChange>();
  readonly columns = input.required<Column[]>();
  readonly rows = input.required<ReportRow[]>();
  readonly filteringApplied = input(false);
  readonly filteredRows = computed(() => {
    const rules = this.columnRules();
    if (this.filteringApplied() || !Object.keys(rules).length) return this.rows();
    const visit = (rows: ReportRow[]): ReportRow[] =>
      rows.flatMap((row) => {
        if (row.isTotal) return [row];
        const children = row.children ? visit(row.children) : [];
        const matches =
          selectColumns([row], rules, (r) => ({ label: r.label, ...r.cells })).length > 0;
        return matches || children.length
          ? [{ ...row, children: row.children ? children : undefined }]
          : [];
      });
    return visit(this.rows());
  });
  readonly filterOptions = computed(() => {
    const flatten = (rows: ReportRow[]): ReportRow[] =>
      rows.flatMap((row) => [...(row.isTotal ? [] : [row]), ...flatten(row.children || [])]);
    return {
      ...columnChoices(flatten(this.rows()), this.columnRules(), (row) => ({
        label: row.label,
        ...row.cells,
      })),
      ...this.columnOptions(),
    };
  });
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
  readonly sorted = computed(() => this.sortRows(this.filteredRows()));
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
