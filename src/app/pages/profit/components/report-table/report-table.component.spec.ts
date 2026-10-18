import { ReportTableModule } from './report-table.module';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReportTable } from './report-table.component';
import type { ReportRow } from './infrastructure/interfaces/report-table.interfaces';

describe('Financial hierarchy and sorting', () => {
  it('keeps the group and reporting totals when a column selects one child', () => {
    const { fixture, table } = setup();
    const child = { id: 'child', label: 'Товар A', cells: { amount: '12.5' } };
    fixture.componentRef.setInput('rows', [
      {
        id: 'group',
        label: 'Группа',
        cells: { amount: '30' },
        children: [child, { id: 'other', label: 'Товар B', cells: { amount: '17.5' } }],
      },
      { id: 'total', label: 'Итого', cells: { amount: '30' }, isTotal: true },
    ]);
    fixture.componentRef.setInput('columnRules', {
      amount: { values: null, text: '', operator: 'contains', min: '12,5', max: '12,5' },
    });
    expect(table.filteredRows()[0].children).toEqual([child]);
    expect(table.filteredRows()[0].cells['amount']).toBe('30');
    expect(table.filteredRows()[1].isTotal).toBe(true);
    expect(table.filterOptions()['amount']).toEqual(['12.5', '17.5', '30']);
  });
  function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ReportTable);
    fixture.componentRef.setInput('columns', [{ key: 'amount', label: 'Сумма', format: 'money' }]);
    fixture.componentRef.setInput('rows', []);
    return { fixture, table: fixture.componentInstance };
  }
  it('sorts detail rows as well as groups, keeps missing values last and pins the total', () => {
    const { table } = setup();
    table.sortBy('amount');
    table.sortBy('amount');
    const rows: ReportRow[] = [
      { id: 'missing', label: 'Нет', cells: { amount: null } },
      { id: 'one', label: 'Один', cells: { amount: '1' } },
      { id: 'two', label: 'Два', cells: { amount: '2' } },
      { id: 'total', label: 'Итого', cells: { amount: '3' }, isTotal: true },
    ];
    expect(table.sortRows(rows).map((r) => r.id)).toEqual(['two', 'one', 'missing', 'total']);
  });
  it('expands a category, a type subtotal and its articles without flattening the hierarchy', () => {
    const { fixture, table } = setup();
    fixture.componentRef.setInput('identityLinks', false);
    fixture.componentRef.setInput('rows', [
      {
        id: 'cat',
        label: 'Категория',
        cells: { amount: '3' },
        children: [
          {
            id: 'type',
            label: 'Тип',
            cells: { amount: '3' },
            children: [{ id: 'offer', label: 'Товар A', cells: { amount: '3' } }],
          },
        ],
      },
    ]);
    table.toggle('cat');
    table.toggle('type');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('[data-finance-value]').length).toBe(3);
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [ReportTableModule] }));
