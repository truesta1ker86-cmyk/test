import {
  afterRenderEffect,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PricingRow } from '../core/contracts';
import { money, percent, source } from '../core/format';
import { editorFields, displayInput, EditorField } from './editor-fields';
import { SortColumn } from './pricing-query';
import { PricingQuery, parsePricingQuery } from './pricing-query';
import { PricingColumnFilter, PriceColumnChange } from './pricing-column-filter';
export type PricingCellChange = { row: PricingRow; field: string; value: string };
import { PricingWorkingCell, WorkingCellChange } from './working-cell';
export type PricingWorkingChange = WorkingCellChange & { row: PricingRow };
type Column = {
  key: string;
  label: string;
  kind?: 'money' | 'rate';
  edit?: string;
  working?: WorkingCellChange['field'];
  sort?: SortColumn;
};
const columns: Column[] = [
  { key: 'fin_type', label: 'Тип Фин', edit: 'fin_type', sort: 'fin_type' },
  { key: 'ozon_type', label: 'Тип маркетплейса', edit: 'ozon_type', sort: 'ozon_type' },
  {
    key: 'ship_method',
    label: 'Метод',
    edit: 'ship_method',
    sort: 'ship_method',
  },
  { key: 'volume', label: 'Объём, л', edit: 'volume' },
  { key: 'units_per_item', label: 'Штук в одной позиции', edit: 'units_per_item' },
  {
    key: 'calculated_old_price',
    label: 'Цена до скидки, ₽',
    kind: 'money',
    sort: 'last_old_price',
  },
  {
    key: 'calculated_price',
    label: 'Цена, ₽',
    kind: 'money',
    sort: 'last_price',
    working: 'price',
  },
  {
    key: 'working_min_price',
    label: 'Минималка, ₽',
    kind: 'money',
    sort: 'last_min_price',
    working: 'min_price',
  },
  {
    key: 'effective_cost',
    label: 'Себестоимость, ₽',
    kind: 'money',
    edit: 'manual_cost',
    sort: 'last_cost',
  },
  { key: 'actual_cost', label: 'Себес API 🔒', kind: 'money' },
  { key: 'actual_buyer_margin', label: 'Маржа Ozon API, %', kind: 'rate' },
  {
    key: 'effective_margin',
    label: 'Целевая маржа, %',
    kind: 'rate',
    edit: 'fixed_margin',
    working: 'margin',
    sort: 'last_margin',
  },
  { key: 'current_marketplace_min_price', label: 'Мин. цена Ozon', kind: 'money' },
  { key: 'marketplace_expense_base_price', label: 'Ценовая база API, ₽', kind: 'money' },
  { key: 'current_commission', label: 'Комиссия Ozon API', kind: 'rate', sort: 'last_commission' },
  {
    key: 'effective_logistics',
    label: 'Плановая логистика / оценка Ozon',
    kind: 'money',
    sort: 'last_logistics',
  },
  {
    key: 'excel_advertising_rate',
    label: 'Реклама, %',
    kind: 'rate',
    edit: 'excel_advertising_rate',
  },
  {
    key: 'brand_promotion_rate',
    label: 'Продвижение бренда, %',
    kind: 'rate',
    edit: 'brand_promotion_rate',
  },
  {
    key: 'promotion_adjustment_rate',
    label: 'Корректировка акций, %',
    kind: 'rate',
    edit: 'promotion_adjustment_rate',
  },
  { key: 'advertising_expense', label: 'Реклама Ozon', kind: 'money' },
];
@Component({
  selector: 'app-pricing-grid',
  imports: [FormsModule, PricingColumnFilter, PricingWorkingCell],
  templateUrl: './pricing-grid.html',
  styleUrls: ['./pricing-workflow.css', './pricing-grid.css'],
})
export class PricingGrid {
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
    return row[key] as import('../core/contracts').Amount;
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
