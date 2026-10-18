import {
  computed as selectionComputed,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { stockValidationState } from '../../../infrastructure/utils/stock-drafts.utils';
import type {
  MatrixCell,
  Rule,
  StockFact,
  StockWarehouse,
} from '../../../infrastructure/interfaces/contracts.interfaces';
import {
  changedCell,
  estimateCell,
  percentageToShare,
  shareToPercentage,
  shareFromQuantity,
  targetFromPercent,
  targetPercent,
} from '../../../infrastructure/utils/matrix-state.utils';
import type { Defaults } from './infrastructure/types/stock-allocation.types';
import { key } from './infrastructure/utils/stock-allocation.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-allocation-matrix',

  templateUrl: './allocation-matrix.component.html',
  styleUrl: './allocation-matrix.component.css',
})
export class AllocationMatrixComponent {
  readonly visibleTableSelection = selectionComputed(() =>
    this.rows().filter((row) => this.selection().has(row.offer_id)),
  );

  tableColumns1(): DataTableColumn[] {
    return [
      {
        field: 'column_1',
        header: 'Номенклатура / артикул',
        styleClass: 'product-column',
        cellTemplate: { slot: 'cell1' },
      },
      {
        field: 'column_2',
        header: 'Физический остаток 1С Полные упаковки · все склады 1С',
        styleClass: 'physical-column',
        cellTemplate: { slot: 'cell2' },
      },
      ...this.visible().flatMap((w) => [
        {
          field: 'column_3',
          header: '',
          styleClass: 'warehouse-column',
          cellTemplate: { slot: 'cell3', item: w },
        },
      ]),
    ];
  }

  readonly rows = input.required<StockFact[]>();
  readonly warehouses = input.required<StockWarehouse[]>();
  readonly rules = input.required<Rule[]>();
  readonly drafts = input.required<MatrixCell[]>();
  readonly selection = input.required<Set<string>>();
  readonly columns = input<string[] | null>(null);
  readonly busy = input(false);
  readonly canWrite = input(false);
  readonly snapshotWarehouses = input<string[]>([]);
  readonly defaults = input<Record<string, Defaults>>({});
  readonly allPercent = input('100');
  readonly sort = input('offer_id');
  readonly direction = input('asc');
  readonly sortChange = output<string>();
  readonly defaultsChange = output<Record<string, Defaults>>();
  readonly allPercentChange = output<string>();
  readonly draftsChange = output<MatrixCell[]>();
  readonly selectionChange = output<Set<string>>();
  readonly columnsChange = output<string[]>();
  readonly validityChange = output<boolean>();
  readonly saved = computed(
    () => new Map(this.rules().map((r) => [key(r.offer_id, r.warehouse_id || ''), r])),
  );
  readonly pending = computed(
    () => new Map(this.drafts().map((r) => [key(r.offer_id, r.warehouse_id), r])),
  );
  readonly rowsByOffer = computed(() => new Map(this.rows().map((row) => [row.offer_id, row])));
  readonly pendingOffers = computed(() => new Set(this.drafts().map((row) => row.offer_id)));
  readonly orderedWarehouses = computed(() =>
    [...this.warehouses()].sort((a, b) =>
      a.warehouse_id.localeCompare(b.warehouse_id, 'ru', { numeric: true, sensitivity: 'base' }),
    ),
  );
  readonly visible = computed(() => {
    const selected = this.columns();
    return this.orderedWarehouses()
      .filter((w) => (selected ? selected.includes(w.warehouse_id) : w.available !== false))
      .slice(0, 12);
  });
  readonly visibleIds = computed(() => this.visible().map((w) => w.warehouse_id));
  readonly allChecked = computed(
    () => !!this.rows().length && this.rows().every((r) => this.selection().has(r.offer_id)),
  );
  readonly validation = input(stockValidationState());
  get errors() {
    return this.validation().errors;
  }
  get invalidInputs() {
    return this.validation().invalidInputs;
  }
  private fillRevision = 0;
  private destroyed = false;
  readonly invalidCount = computed(() => Object.keys(this.invalidInputs()).length);
  readonly filling = signal(false);
  readonly estimate = estimateCell;
  readonly percent = shareToPercentage;
  readonly targetPercent = targetPercent;
  ngOnInit() {
    this.validityChange.emit(!Object.keys(this.errors()).some((key) => key.includes('\t')));
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.fillRevision++;
    this.filling.set(false);
  }
  currentQuantity(row: StockFact, wh: string) {
    return row.ozon_by_warehouse?.[wh] ?? (this.snapshotWarehouses().includes(wh) ? 0 : null);
  }
  displayed(row: StockFact, wh: string) {
    const cell = this.state(row.offer_id, wh);
    return cell
      ? estimateCell(row.matrix_physical_base ?? null, row.units_per_item || 1, cell)
      : '0';
  }
  remaining(row: StockFact, wh: string) {
    if (row.matrix_physical == null) return null;
    const displayed = this.displayed(row, wh);
    return displayed == null || this.state(row.offer_id, wh)?.maintain_target
      ? row.matrix_physical
      : Math.max(0, row.matrix_physical - Number(displayed));
  }
  exactPercent(offer: string, wh: string) {
    const cell = this.state(offer, wh),
      row = this.rowsByOffer().get(offer);
    return cell?.maintain_target
      ? targetPercent(cell.target_qty ?? 0, row?.matrix_physical ?? null)
      : cell
        ? shareToPercentage(cell.share)
        : '';
  }
  clearInvalidInputs() {
    this.invalidInputs.set({});
    this.errors.update((errors) =>
      Object.fromEntries(Object.entries(errors).filter(([id]) => !id.includes('\t'))),
    );
    this.validityChange.emit(true);
  }
  state(offer: string, wh: string): MatrixCell | Rule | null {
    return this.pending().get(key(offer, wh)) || this.saved().get(key(offer, wh)) || null;
  }
  isDirty(offer: string, wh: string) {
    return this.pending().has(key(offer, wh));
  }
  default(wh: string): Defaults {
    return this.defaults()[wh] || { fixed: false, value: '100', quantum: '1' };
  }
  setDefault(wh: string, field: keyof Defaults, value: string | boolean) {
    const current = this.default(wh);
    const next = { ...current, [field]: value };
    if (field === 'fixed' && value !== current.fixed) next.value = value ? '0' : '100';
    this.defaultsChange.emit({ ...this.defaults(), [wh]: next });
  }
  toggleWarehouse(wh: string, checked: boolean) {
    const selected = this.visible().map((w) => w.warehouse_id);
    if (checked && selected.length >= 12) {
      this.fail('columns', 'Одновременно можно показать 12 складов. Скройте один из столбцов.');
      return;
    }
    this.fail('columns', '');
    this.columnsChange.emit(checked ? [...selected, wh] : selected.filter((id) => id !== wh));
  }
  toggle(offer: string, checked: boolean) {
    const next = new Set(this.selection());
    checked ? next.add(offer) : next.delete(offer);
    this.selectionChange.emit(next);
  }
  togglePage(checked: boolean) {
    const next = new Set(this.selection());
    this.rows().forEach((r) => (checked ? next.add(r.offer_id) : next.delete(r.offer_id)));
    this.selectionChange.emit(next);
  }
  private fail(id: string, message: string) {
    this.errors.update((s) => {
      const next = { ...s };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
    this.validityChange.emit(
      !Object.keys(this.errors()).some((k) => k !== 'columns' && k !== 'bulk'),
    );
  }
  cellError(offer: string, wh: string) {
    const prefix = key(offer, wh) + '\t';
    return Object.entries(this.errors()).find(([id]) => id.startsWith(prefix))?.[1] || '';
  }
  private clearCellErrors(offer: string, wh: string) {
    const prefix = key(offer, wh) + '\t';
    this.errors.update((errors) =>
      Object.fromEntries(Object.entries(errors).filter(([id]) => !id.startsWith(prefix))),
    );
    this.invalidInputs.update((values) =>
      Object.fromEntries(Object.entries(values).filter(([id]) => !id.startsWith(prefix))),
    );
    this.validityChange.emit(
      !Object.keys(this.errors()).some((id) => id !== 'bulk' && id !== 'columns'),
    );
  }
  inputValue(offer: string, wh: string, field: string): string | number {
    const id = key(offer, wh) + '\t' + field;
    if (Object.hasOwn(this.invalidInputs(), id)) return this.invalidInputs()[id];
    const cell = this.state(offer, wh),
      row = this.rowsByOffer().get(offer);
    if (field === 'percent') {
      const exact = this.exactPercent(offer, wh);
      return exact.length > 18
        ? Number(exact).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 6 })
        : exact;
    }
    if (field === 'quantity')
      return cell?.maintain_target
        ? (cell.target_qty ?? '')
        : cell
          ? (estimateCell(row?.matrix_physical_base ?? null, row?.units_per_item || 1, cell) ?? '')
          : 0;
    return cell?.quantum || 1;
  }
  private integer(value: string, minimum: number) {
    const number = Number(value);
    if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(number) || number < minimum)
      throw new Error('Укажите целое число от ' + minimum + '.');
    return number;
  }
  private build(offer: string, wh: string, d: Defaults): MatrixCell {
    return {
      offer_id: offer,
      warehouse_id: wh,
      maintain_target: d.fixed,
      target_qty: d.fixed ? this.integer(d.value, 0) : null,
      share: d.fixed ? null : percentageToShare(d.value),
      quantum: this.integer(d.quantum, 1),
      enabled: d.fixed ? Number(d.value) > 0 : Number(percentageToShare(d.value)) > 0,
    };
  }
  change(offer: string, wh: string, field: string, value: string | boolean) {
    if (!this.canWrite() || this.busy() || this.filling() || this.destroyed) return;
    const id = key(offer, wh);
    const inputId = id + '\t' + field;
    const current = this.state(offer, wh);
    const physical = this.rowsByOffer().get(offer)?.matrix_physical ?? null;
    const next: MatrixCell = {
      maintain_target: false,
      target_qty: null,
      share: '1',
      quantum: 1,
      enabled: true,
      ...current,
      offer_id: offer,
      warehouse_id: wh,
    };
    try {
      if (field === 'mode') {
        next.maintain_target = value === 'fixed';
        if (next.maintain_target) {
          next.target_qty =
            next.target_qty ?? targetFromPercent(shareToPercentage(next.share), physical) ?? 0;
          next.share = null;
        } else {
          next.share = next.share ?? shareFromQuantity(next.target_qty ?? 0, physical) ?? '1';
          next.target_qty = null;
        }
      } else if (field === 'quantity') {
        const quantity = this.integer(String(value), 0);
        if (next.maintain_target) next.target_qty = quantity;
        else {
          const share = shareFromQuantity(quantity, physical);
          if (share === null)
            throw new Error('Для пересчёта количества нужен положительный физический остаток 1С.');
          next.share = share;
        }
      } else if (field === 'percent') {
        if (next.maintain_target) {
          const target = targetFromPercent(String(value), physical);
          if (target === null) throw new Error('Для пересчёта процентов нужен снимок остатка 1С.');
          next.target_qty = target;
        } else next.share = percentageToShare(String(value));
      } else if (field === 'value') {
        if (next.maintain_target) next.target_qty = this.integer(String(value), 0);
        else next.share = percentageToShare(String(value));
      } else if (field === 'quantum') next.quantum = this.integer(String(value), 1);
      else if (field === 'enabled') next.enabled = !!value;
      if (field !== 'enabled')
        next.enabled = Number(next.maintain_target ? next.target_qty : next.share) > 0;
      if (field === 'mode') this.clearCellErrors(offer, wh);
      this.invalidInputs.update((values) => {
        const next = { ...values };
        delete next[inputId];
        return next;
      });
      this.fail(inputId, '');
      const drafts = new Map(this.pending());
      changedCell(next, this.saved().get(id) || null) ? drafts.set(id, next) : drafts.delete(id);
      this.draftsChange.emit([...drafts.values()]);
    } catch (e) {
      this.invalidInputs.update((values) => ({ ...values, [inputId]: String(value) }));
      this.fail(inputId, (e as Error).message);
    }
  }
  reset(offer: string, wh: string) {
    this.clearCellErrors(offer, wh);
    this.draftsChange.emit(
      this.drafts().filter((r) => key(r.offer_id, r.warehouse_id) !== key(offer, wh)),
    );
  }
  clearEdits() {
    this.fillRevision++;
    this.filling.set(false);
    this.errors.set({});
    this.invalidInputs.set({});
    this.validityChange.emit(true);
    this.draftsChange.emit([]);
  }
  async fill(warehouse?: string) {
    if (this.filling() || this.busy() || !this.canWrite() || this.destroyed) return;
    const columns = warehouse
      ? this.visible().filter((w) => w.warehouse_id === warehouse)
      : this.visible();
    if (!this.selection().size || !columns.length) {
      this.fail('bulk', 'Выберите товары и склады.');
      return;
    }
    const revision = ++this.fillRevision;
    const selection = [...this.selection()];
    const saved = new Map(this.saved());
    try {
      const settings = columns.map((w) => ({
        wh: w.warehouse_id,
        d: warehouse
          ? this.default(w.warehouse_id)
          : {
              fixed: false,
              value: this.allPercent(),
              quantum: this.default(w.warehouse_id).quantum,
            },
      }));
      settings.forEach((s) => this.build('_validation', s.wh, s.d));
      this.filling.set(true);
      this.fail('bulk', '');
      const drafts = new Map(this.pending());
      const changedPairs = new Set<string>();
      let count = 0;
      for (const offer of selection) {
        for (const { wh, d } of settings) {
          const cell = this.build(offer, wh, d);
          const id = key(offer, wh);
          changedPairs.add(id);
          changedCell(cell, saved.get(id) || null) ? drafts.set(id, cell) : drafts.delete(id);
        }
        if (++count % 200 === 0) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          if (this.destroyed || this.fillRevision !== revision) return;
        }
      }
      const untouched = (values: Record<string, string>) =>
        Object.fromEntries(
          Object.entries(values).filter(
            ([id]) => !changedPairs.has(id.slice(0, id.lastIndexOf('\t'))),
          ),
        );
      this.errors.update(untouched);
      this.invalidInputs.update(untouched);
      this.validityChange.emit(
        !Object.keys(this.errors()).some((id) => id !== 'bulk' && id !== 'columns'),
      );
      this.draftsChange.emit([...drafts.values()]);
    } catch (e) {
      this.fail('bulk', (e as Error).message);
    } finally {
      if (this.fillRevision === revision) this.filling.set(false);
    }
  }
}
