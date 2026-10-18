import {
  computed as selectionComputed,
  ChangeDetectionStrategy,
  afterRenderEffect,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type { PricingRow } from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { money, percent, source } from '../../../../core/infrastructure/utils/format.utils';
import { editorFields } from '../../infrastructure/constants/editor-fields.constants';
import { displayInput } from '../../infrastructure/utils/editor-fields.utils';
import type { SortColumn } from '../../infrastructure/types/pricing-query.types';
import type { PricingQuery } from '../../infrastructure/interfaces/pricing-query.interfaces';
import { parsePricingQuery } from '../../infrastructure/utils/pricing-query.utils';
import type { PriceColumnChange } from '../pricing-column-filter/infrastructure/interfaces/pricing-column-filter.interfaces';
import type { WorkingCellChange } from '../working-cell/infrastructure/interfaces/working-cell.interfaces';
import type {
  PricingCellChange,
  PricingWorkingChange,
  Column,
} from './infrastructure/types/pricing-grid.types';
import { columns } from './infrastructure/constants/pricing-grid.constants';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-pricing-grid',

  templateUrl: './pricing-grid.component.html',
  styleUrls: ['../../infrastructure/styles/pricing-workflow.css', './pricing-grid.component.css'],
})
export class PricingGrid {
  readonly visibleTableSelection = selectionComputed(() =>
    this.rows().filter((row) => this.selection().has(row.offer_id)),
  );

  tableColumns1(): DataTableColumn[] {
    return [
      { field: 'column_1', header: '', cellTemplate: { slot: 'cell1' } },
      {
        field: 'column_2',
        header: 'Артикул',
        styleClass: 'offer-cell',
        cellTemplate: { slot: 'cell2' },
      },
      {
        field: 'column_3',
        header: 'Номенклатура',
        styleClass: 'name-cell',
        cellTemplate: { slot: 'cell3' },
      },
      ...(this.failed()
        ? [
            {
              field: 'column_4',
              header: 'Причина · что мешает расчёту',
              styleClass: 'repair-reason',
              cellTemplate: { slot: 'cell4' },
            },
          ]
        : []),
      ...this.columns().flatMap((c) => [
        {
          field: 'column_5',
          header: '@if (c.sort) { } @else { }',
          cellTemplate: { slot: 'cell5', item: c },
        },
      ]),
      ...(!this.failed()
        ? [{ field: 'column_6', header: 'Формула', cellTemplate: { slot: 'cell6' } }]
        : []),
      {
        field: 'column_7',
        header: 'Действия',
        styleClass: 'row-actions',
        cellTemplate: { slot: 'cell7' },
      },
    ];
  }

  readonly workingChanged = output<PricingWorkingChange>();
  readonly activeCell = signal('');
  readonly hasMore = input(false);
  readonly moreBusy = input(false);
  readonly moreError = input('');
  readonly more = output<void>();
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('loadSentinel');
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  constructor() {
    afterRenderEffect((onCleanup) => {
      const sentinel = this.sentinel()?.nativeElement;
      const root = this.scroller()?.nativeElement;
      if (
        !sentinel ||
        !root ||
        this.moreBusy() ||
        this.moreError() ||
        !this.hasMore() ||
        typeof IntersectionObserver === 'undefined'
      )
        return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this.more.emit();
        },
        {
          root: root.scrollHeight > root.clientHeight ? root : null,
          rootMargin: '0px 0px 320px 0px',
        },
      );
      observer.observe(sentinel);
      onCleanup(() => observer.disconnect());
    });
  }
  loadOnScroll() {
    const root = this.scroller()?.nativeElement;
    if (
      root &&
      this.hasMore() &&
      !this.moreBusy() &&
      !this.moreError() &&
      root.scrollHeight - root.scrollTop - root.clientHeight < 320
    )
      this.more.emit();
  }
  readonly query = input<PricingQuery>(parsePricingQuery({}));
  readonly columnChanged = output<PriceColumnChange>();
  readonly rows = input<PricingRow[]>([]);
  readonly selection = input<ReadonlySet<string>>(new Set<string>());
  readonly drafts = input<Record<string, Record<string, string>>>({});
  readonly editing = input(false);
  readonly failed = input(false);
  readonly canManage = input(false);
  readonly busy = input(false);
  readonly sortColumn = input('offer_id');
  readonly sortDirection = input('asc');
  readonly selected = output<string>();
  readonly pageSelected = output<boolean>();
  readonly sorted = output<SortColumn>();
  readonly details = output<PricingRow>();
  readonly edit = output<string>();
  readonly recalc = output<string>();
  readonly saved = output<string>();
  readonly changed = output<PricingCellChange>();
  readonly money = money;
  readonly source = source;
  readonly percent = percent;
  changeWorking(row: PricingRow, change: WorkingCellChange) {
    this.workingChanged.emit({ row, ...change });
  }
  amount(row: PricingRow, key: string) {
    return row[key] as import('../../../../core/infrastructure/contracts').Amount;
  }
  range(row: PricingRow, low: string, high: string) {
    const a = this.amount(row, low),
      b = this.amount(row, high);
    return a == null
      ? '—'
      : b == null || Number(a) === Number(b)
        ? money(a)
        : money(a) + ' – ' + money(b);
  }
  editingCell(row: PricingRow, c: Column) {
    return this.editing() || this.failed() || this.activeCell() === row.offer_id + ':' + c.key;
  }
  beginCell(row: PricingRow, c: Column) {
    if (c.edit && !c.working && this.canManage() && !this.busy())
      this.activeCell.set(row.offer_id + ':' + c.key);
  }
  columns() {
    return this.failed()
      ? columns
          .filter((c) => !!c.edit)
          .map((c) =>
            c.key === 'ship_method'
              ? {
                  ...c,
                  key: 'plan_ship_method',
                  label: 'Метод минималки',
                  edit: 'plan_ship_method',
                  sort: undefined,
                }
              : c,
          )
      : columns;
  }
  allSelected() {
    return !!this.rows().length && this.rows().every((r) => this.selection().has(r.offer_id));
  }
  field(key: string) {
    return editorFields.find((f) => f.key === key)!;
  }
  input(row: PricingRow, key: string) {
    return this.drafts()[row.offer_id]?.[key] ?? displayInput(this.field(key), row[key]);
  }
  format(row: PricingRow, c: Column) {
    const v = row[c.key];
    if (v === null || v === undefined || v === '') return '—';
    return c.kind === 'money'
      ? money(v as string)
      : c.kind === 'rate'
        ? percent(v as string)
        : String(v);
  }
  sortState(key: string | undefined) {
    return key === this.sortColumn()
      ? this.sortDirection() === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none';
  }
}
