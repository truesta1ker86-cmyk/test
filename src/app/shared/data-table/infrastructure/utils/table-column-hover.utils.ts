import { TableColumnRange } from '../interfaces/table-column-hover.interfaces';

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
