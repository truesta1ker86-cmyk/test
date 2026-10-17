import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableColumnHover, tableColumnRanges } from './table-column-hover';
@Component({
  imports: [TableColumnHover],
  template: `<main appTableColumnHover>
    <table>
      <thead>
        <tr>
          <th rowspan="2">Товар</th>
          <th colspan="2">Цены</th>
        </tr>
        <tr>
          <th data-column-label="Полное название минимальной цены"><button>Мин.</button></th>
          <th>Цена</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><button data-hover-name="Полное название длинного товара">A</button></td>
          <td id="minimum" class="dirty">100</td>
          <td id="price"><button (click)="clicked = true">200</button></td>
        </tr>
      </tbody>
    </table>
  </main>`,
})
class TestHost {
  clicked = false;
}

describe('Shared table column hover', () => {
  it('maps grouped headers and highlights only the hovered physical column', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const table = root.querySelector('table')!;
    const cell = root.querySelector<HTMLTableCellElement>('#minimum')!;
    expect(tableColumnRanges(table).get(cell)).toEqual({ start: 1, end: 2 });
    const header = root.querySelector<HTMLTableCellElement>('[data-column-label]')!;
    header.dispatchEvent(
      new MouseEvent('pointerover', { bubbles: true, clientX: 100, clientY: 100 }),
    );
    expect(root.querySelector('#price')!.classList.contains('o1c-column-hover')).toBe(false);
    expect(root.querySelectorAll('.o1c-column-hover').length).toBe(3);
    expect(root.querySelector('[role=tooltip]')!.textContent).toBe(
      'Полное название минимальной цены',
    );
    header.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: null }));
    expect(root.querySelectorAll('.o1c-column-hover').length).toBe(0);
    expect(cell.classList.contains('dirty')).toBe(true);
  });
  it('highlights the product row on body focus without activating the column or its tooltip', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('#price button')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(root.querySelectorAll('.o1c-column-hover').length).toBe(0);
    expect(button.closest('tr')!.classList.contains('o1c-row-hover')).toBe(true);
    expect(root.querySelector('[role=tooltip]')).toBeNull();
    button.click();
    expect(fixture.componentInstance.clicked).toBe(true);
    fixture.destroy();
    expect(root.querySelector('[role=tooltip]')).toBeNull();
  });
  it('switches from header column to body row and clears both when leaving the table', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector<HTMLTableCellElement>('[data-column-label]')!,
      cell = root.querySelector<HTMLTableCellElement>('#minimum')!;
    header.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(root.querySelectorAll('.o1c-column-hover').length).toBe(3);
    cell.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(root.querySelectorAll('.o1c-column-hover').length).toBe(0);
    expect(cell.closest('tr')!.classList.contains('o1c-row-hover')).toBe(true);
    expect(cell.classList.contains('dirty')).toBe(true);
    cell.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: null }));
    expect(root.querySelector('.o1c-row-hover')).toBeNull();
  });
  it('shows the column title only when keyboard focus enters the heading', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root
      .querySelector('[data-column-label] button')!
      .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(root.querySelector('[role=tooltip]')?.textContent).toBe(
      'Полное название минимальной цены',
    );
    expect(root.querySelector('.o1c-row-hover')).toBeNull();
  });
  it('keeps row highlighting when focus leaves a header after the pointer has entered the body', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector('[data-column-label] button')!,
      cell = root.querySelector('#minimum')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    cell.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(cell.closest('tr')!.classList.contains('o1c-row-hover')).toBe(true);
  });
  it('shows the full product name when moving from its cell onto the name', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector('[data-hover-name]')!;
    button.parentElement!.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(root.querySelector('[role=tooltip]')!.textContent).toBe(
      'Полное название длинного товара',
    );
  });
});
