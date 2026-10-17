import { Directive, ElementRef, HostListener, inject, OnDestroy, Renderer2 } from '@angular/core';

export interface TableColumnRange {
  start: number;
  end: number;
}
/** Physical columns, including the grouped headers used by financial reports. */
export function tableColumnRanges(
  table: HTMLTableElement,
): Map<HTMLTableCellElement, TableColumnRange> {
  const rows = Array.from(table.rows),
    occupied: boolean[][] = [],
    ranges = new Map<HTMLTableCellElement, TableColumnRange>();
  rows.forEach((row, index) => {
    occupied[index] ??= [];
    let column = 0;
    for (const cell of Array.from(row.cells)) {
      while (occupied[index][column]) column++;
      const width = Math.max(1, cell.colSpan),
        remaining = rows.length - index;
      const height = Math.min(
        remaining,
        cell.rowSpan === 0
          ? (row.parentElement?.children.length || remaining) - row.sectionRowIndex
          : Math.max(1, cell.rowSpan),
      );
      ranges.set(cell, { start: column, end: column + width });
      for (let r = index; r < index + height; r++) {
        occupied[r] ??= [];
        for (let c = column; c < column + width; c++) occupied[r][c] = true;
      }
      column += width;
    }
  });
  return ranges;
}

@Directive({ selector: '[appTableColumnHover]' })
export class TableColumnHover implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private activeCell: HTMLTableCellElement | null = null;
  private activeRow: HTMLTableRowElement | null = null;
  private highlighted: HTMLTableCellElement[] = [];
  private tooltip: HTMLElement | null = null;
  private heading = '';

  @HostListener('pointerover', ['$event']) over(event: PointerEvent) {
    this.activate(event.target, event.clientX, event.clientY);
  }
  @HostListener('pointermove', ['$event']) move(event: PointerEvent) {
    if (this.cell(event.target) !== this.activeCell)
      this.activate(event.target, event.clientX, event.clientY);
    else if (this.tooltip) this.position(event.clientX, event.clientY);
  }
  @HostListener('focusin', ['$event']) focus(event: FocusEvent) {
    const cell = this.cell(event.target);
    if (!cell) {
      this.clear();
      return;
    }
    const box = cell.getBoundingClientRect();
    this.activate(event.target, box.left + 12, box.top + 18);
  }
  @HostListener('pointerout', ['$event']) out(event: PointerEvent) {
    const next = this.cell(event.relatedTarget);
    if (!next || next.closest('table') !== this.activeCell?.closest('table')) this.clear();
  }
  @HostListener('focusout', ['$event']) blur(event: FocusEvent) {
    if (
      !this.cell(event.relatedTarget) &&
      event.target instanceof Node &&
      this.activeCell?.contains(event.target)
    )
      this.clear();
  }
  @HostListener('keydown.escape') escape() {
    this.clear();
  }
  private cell(target: EventTarget | null): HTMLTableCellElement | null {
    if (!(target instanceof Element)) return null;
    const cell = target.closest<HTMLTableCellElement>('th,td');
    if (!cell || !this.host.nativeElement.contains(cell)) return null;
    // A filter dialog may be nested in a th, but is not part of the table.
    if (target.closest('dialog') !== cell.closest('table')?.closest('dialog')) return null;
    return cell;
  }
  private activate(target: EventTarget | null, x: number, y: number) {
    const cell = this.cell(target);
    if (!cell) {
      this.clear();
      return;
    }
    if (cell === this.activeCell) {
      this.showTooltip(this.productName(target) || this.heading, x, y);
      return;
    }
    this.clear();
    this.activeCell = cell;
    const table = cell.closest('table')!;
    // Product cells belong to a row. Only the column's heading activates a column.
    if (!cell.closest('thead')) {
      const row = cell.closest('tbody tr') as HTMLTableRowElement | null;
      if (row) {
        this.activeRow = row;
        this.renderer.addClass(row, 'o1c-row-hover');
      }
      this.showTooltip(this.productName(target), x, y);
      return;
    }
    const ranges = tableColumnRanges(table);
    const active = ranges.get(cell)!;
    for (const [other, range] of ranges)
      if (range.start < active.end && range.end > active.start) {
        this.renderer.addClass(other, 'o1c-column-hover');
        this.highlighted.push(other);
      }
    const headers = Array.from(ranges).filter(
      ([other, range]) =>
        other.tagName === 'TH' &&
        other.closest('thead') &&
        range.start <= active.start &&
        range.end >= active.end,
    );
    const header = headers.at(-1)?.[0] || (cell.tagName === 'TH' ? cell : null);
    if (!header) return;
    this.heading =
      header.getAttribute('data-column-label') ||
      header.getAttribute('title') ||
      header.textContent
        ?.replace(/[↑↓↕▾▴]/g, '')
        .replace(/\s+/g, ' ')
        .trim() ||
      '';
    this.showTooltip(this.heading, x, y);
  }
  private showTooltip(title: string, x: number, y: number) {
    if (!title) {
      this.removeTooltip();
      return;
    }
    if (this.tooltip) {
      this.renderer.setProperty(this.tooltip, 'textContent', title);
      this.position(x, y);
      return;
    }
    const tip = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(tip, 'o1c-column-tooltip');
    this.renderer.setAttribute(tip, 'role', 'tooltip');
    this.renderer.appendChild(tip, this.renderer.createText(title));
    this.renderer.appendChild(
      this.activeCell?.closest('table')?.closest('dialog') || this.host.nativeElement,
      tip,
    );
    this.tooltip = tip;
    this.position(x, y);
  }
  private productName(target: EventTarget | null) {
    return target instanceof Element
      ? target.closest('[data-hover-name]')?.getAttribute('data-hover-name') || ''
      : '';
  }
  private position(x: number, y: number) {
    if (!this.tooltip) return;
    const box = this.tooltip.getBoundingClientRect();
    this.renderer.setStyle(
      this.tooltip,
      'left',
      Math.max(8, Math.min(x + 12, window.innerWidth - box.width - 8)) + 'px',
    );
    this.renderer.setStyle(
      this.tooltip,
      'top',
      (y + 18 + box.height > window.innerHeight - 8 ? Math.max(8, y - box.height - 10) : y + 18) +
        'px',
    );
  }
  private clear() {
    for (const cell of this.highlighted) this.renderer.removeClass(cell, 'o1c-column-hover');
    this.highlighted = [];
    if (this.activeRow) this.renderer.removeClass(this.activeRow, 'o1c-row-hover');
    this.activeRow = null;
    this.activeCell = null;
    this.heading = '';
    this.removeTooltip();
  }
  private removeTooltip() {
    if (this.tooltip?.parentNode) this.renderer.removeChild(this.tooltip.parentNode, this.tooltip);
    this.tooltip = null;
  }
  ngOnDestroy() {
    this.clear();
  }
}
