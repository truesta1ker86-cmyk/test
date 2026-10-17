import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  output,
} from '@angular/core';
export interface FinanceSelectionStats {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  unit: string;
}

@Directive({ selector: '[appFinanceCellSelection]', exportAs: 'appFinanceCellSelection' })
export class FinanceCellSelection implements AfterViewInit {
  readonly changed = output<FinanceSelectionStats | null>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private selected = new Set<HTMLTableCellElement>();
  private anchor: HTMLTableCellElement | null = null;
  private dragging = false;
  private base: HTMLTableCellElement[] = [];
  ngAfterViewInit() {
    const observer = new MutationObserver(() => {
      if ([...this.selected].some((c) => !c.isConnected)) this.clear();
    });
    observer.observe(this.host.nativeElement, { childList: true, subtree: true });
    this.destroy.onDestroy(() => observer.disconnect());
  }
  private cell(target: EventTarget | null) {
    if (
      !(target instanceof Element) ||
      target.closest('button,input,select,textarea,a,summary,dialog')
    )
      return null;
    return target.closest<HTMLTableCellElement>('td[data-finance-value]');
  }
  private cells(table: HTMLTableElement) {
    return [...table.tBodies]
      .flatMap((b) => [...b.rows])
      .filter((r) => !r.hidden)
      .flatMap((r) => [...r.cells])
      .filter((c) => c.hasAttribute('data-finance-value'));
  }
  private range(first: HTMLTableCellElement, last: HTMLTableCellElement) {
    const table = first.closest('table');
    if (!table || table !== last.closest('table')) return;
    const rows = [...table.tBodies].flatMap((b) => [...b.rows]).filter((r) => !r.hidden);
    const a = rows.indexOf(first.parentElement as HTMLTableRowElement),
      b = rows.indexOf(last.parentElement as HTMLTableRowElement);
    const cells = rows
      .slice(Math.min(a, b), Math.max(a, b) + 1)
      .flatMap((r) =>
        [...r.cells].slice(
          Math.min(first.cellIndex, last.cellIndex),
          Math.max(first.cellIndex, last.cellIndex) + 1,
        ),
      )
      .filter((c) => c.hasAttribute('data-finance-value'));
    this.paint([...this.base, ...cells]);
  }
  private paint(cells: HTMLTableCellElement[]) {
    this.selected.forEach((c) => c.classList.remove('finance-cell-selected'));
    this.selected = new Set(cells);
    this.selected.forEach((c) => c.classList.add('finance-cell-selected'));
    const values = [...this.selected]
      .map((c) => Number(c.dataset['financeValue']))
      .filter(Number.isFinite);
    const units = new Set([...this.selected].map((c) => c.dataset['financeUnit'] || 'number'));
    if (!values.length) {
      this.changed.emit(null);
      return;
    }
    const sum = values.reduce((a, b) => a + b, 0);
    this.changed.emit({
      count: values.length,
      sum,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      unit: units.size === 1 ? [...units][0] : 'mixed',
    });
  }
  clear() {
    this.paint([]);
    this.anchor = null;
    this.dragging = false;
    this.base = [];
  }
  @HostListener('pointerdown', ['$event']) down(event: PointerEvent) {
    const cell = this.cell(event.target);
    if (!cell || event.button !== 0) return;
    event.preventDefault();
    cell.focus();
    if (event.shiftKey && this.anchor) {
      this.base = [];
      this.range(this.anchor, cell);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      this.paint(
        this.selected.has(cell)
          ? [...this.selected].filter((c) => c !== cell)
          : [...this.selected, cell],
      );
      this.anchor = cell;
      return;
    }
    this.base = [];
    this.anchor = cell;
    this.dragging = true;
    this.paint([cell]);
  }
  @HostListener('pointerover', ['$event']) over(event: PointerEvent) {
    const cell = this.cell(event.target);
    if (cell && this.dragging && this.anchor) this.range(this.anchor, cell);
  }
  @HostListener('document:pointerup') up() {
    this.dragging = false;
  }
  @HostListener('keydown', ['$event']) key(event: KeyboardEvent) {
    if ((event.target as Element)?.closest('button,input,select,textarea,dialog')) return;
    const focused = this.cell(event.target);
    if (focused && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.anchor = focused;
      this.paint([focused]);
      return;
    }
    if (focused && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.anchor = focused;
      this.paint(this.cells(focused.closest('table')!));
      return;
    }
    if (event.key === 'Escape') {
      this.clear();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && this.selected.size) {
      event.preventDefault();
      void navigator.clipboard?.writeText(this.copyText());
      return;
    }
    if (!event.key.startsWith('Arrow') || !this.anchor) return;
    const table = this.anchor.closest('table')!,
      cells = this.cells(table),
      current = this.cell(event.target) || this.anchor;
    const rows = [...table.tBodies].flatMap((b) => [...b.rows]).filter((r) => !r.hidden);
    const index = rows.indexOf(current.parentElement as HTMLTableRowElement),
      column = current.cellIndex;
    const target =
      event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        ? cells.filter((c) => c.parentElement === current.parentElement)[
            [...cells.filter((c) => c.parentElement === current.parentElement)].indexOf(current) +
              (event.key === 'ArrowLeft' ? -1 : 1)
          ]
        : rows[index + (event.key === 'ArrowUp' ? -1 : 1)]?.cells[column];
    if (!target?.hasAttribute('data-finance-value')) return;
    event.preventDefault();
    target.focus();
    if (event.shiftKey) {
      this.base = [];
      this.range(this.anchor, target);
    } else {
      this.anchor = target;
      this.paint([target]);
    }
  }
  copyText() {
    const rows = new Map<HTMLTableRowElement, HTMLTableCellElement[]>();
    for (const cell of this.selected) {
      const row = cell.parentElement as HTMLTableRowElement;
      rows.set(row, [...(rows.get(row) || []), cell]);
    }
    return [...rows]
      .sort(([a], [b]) => a.rowIndex - b.rowIndex)
      .map(([, cells]) =>
        cells
          .sort((a, b) => a.cellIndex - b.cellIndex)
          .map((c) => (c.textContent || '').trim())
          .join('\t'),
      )
      .join('\n');
  }
}
