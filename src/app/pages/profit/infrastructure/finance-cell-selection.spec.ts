import { FinanceCellSelectionModule } from '../directives/finance-cell-selection/finance-cell-selection.module';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DataTableModule } from '../../../shared/data-table/data-table.module';
import { FinanceCellSelection } from '../directives/finance-cell-selection/finance-cell-selection.directive';

@Component({
  imports: [FinanceCellSelectionModule],
  template: `<section appFinanceCellSelection>
    <table>
      <tbody>
        <tr>
          <td tabindex="0" data-finance-value="100" data-finance-unit="money">100 ₽</td>
          <td tabindex="0" data-finance-value="-20" data-finance-unit="money">−20 ₽</td>
        </tr>
        <tr>
          <td tabindex="0" data-finance-value="3" data-finance-unit="number">3</td>
          <td><button>Открыть</button></td>
        </tr>
      </tbody>
    </table>
  </section>`,
})
class SelectionTest {}

@Component({
  imports: [DataTableModule, FinanceCellSelectionModule],
  template: `<section appFinanceCellSelection>
    <app-data-table
      [columns]="columns"
      [data]="rows"
      [lazy]="false"
      selectionMode="none"
      [rowClickable]="false"
    >
      <ng-template #cellTemplate let-row let-column="column"
        ><span
          tabindex="0"
          [attr.data-finance-value]="row[column.field]"
          data-finance-unit="money"
          >{{ row[column.field] }}</span
        ></ng-template
      >
    </app-data-table>
  </section>`,
})
class PrimeSelectionTest {
  columns = [
    { field: 'revenue', header: 'Продажи', cellTemplate: true },
    { field: 'cost', header: 'Себестоимость', cellTemplate: true },
  ];
  rows = [{ revenue: 100, cost: -20 }];
}

describe('Financial cell range selection', () => {
  function setup() {
    const fixture = TestBed.createComponent(SelectionTest);
    fixture.detectChanges();
    const directive = fixture.debugElement
      .query(By.directive(FinanceCellSelection))
      .injector.get(FinanceCellSelection);
    const changed = vi.fn();
    directive.changed.subscribe(changed);
    const cells = fixture.nativeElement.querySelectorAll('td');
    return { fixture, directive, changed, cells };
  }
  it('computes signed totals for a dragged range and copies a TSV row', () => {
    const { directive, changed, cells } = setup();
    cells[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    cells[1].dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    document.dispatchEvent(new Event('pointerup'));
    expect(changed).toHaveBeenLastCalledWith({
      count: 2,
      sum: 80,
      average: 40,
      min: -20,
      max: 100,
      unit: 'money',
    });
    expect(directive.copyText()).toBe('100 ₽\t−20 ₽');
  });
  it('flags mixed units, ignores controls, and clears its selected cells', () => {
    const { fixture, directive, changed, cells } = setup();
    cells[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new Event('pointerup'));
    cells[2].dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: true }),
    );
    expect(changed.mock.lastCall![0].unit).toBe('mixed');
    const before = changed.mock.calls.length;
    fixture.nativeElement
      .querySelector('button')
      .dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(changed.mock.calls.length).toBe(before);
    directive.clear();
    expect(changed).toHaveBeenLastCalledWith(null);
    expect(fixture.nativeElement.querySelectorAll('.finance-cell-selected').length).toBe(0);
  });
  it('selects a focused number with Enter and extends the range with Shift+Arrow', () => {
    const { changed, cells } = setup();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(changed.mock.lastCall![0].count).toBe(1);
    cells[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }),
    );
    expect(changed.mock.lastCall![0].sum).toBe(80);
  });
  it('selects physical PrimeNG cells when financial metadata comes from the employer cell template', () => {
    const fixture = TestBed.createComponent(PrimeSelectionTest);
    fixture.detectChanges();
    const directive = fixture.debugElement
      .query(By.directive(FinanceCellSelection))
      .injector.get(FinanceCellSelection);
    const changed = vi.fn();
    directive.changed.subscribe(changed);
    const values = fixture.nativeElement.querySelectorAll('tbody span[data-finance-value]');
    values[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    values[1].dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    document.dispatchEvent(new Event('pointerup'));
    expect(changed.mock.lastCall![0].sum).toBe(80);
    expect(fixture.nativeElement.querySelectorAll('td.finance-cell-selected')).toHaveLength(2);
    expect(directive.copyText()).toBe('100\t-20');
  });
});
