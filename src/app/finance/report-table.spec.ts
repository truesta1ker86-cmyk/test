import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReportTable, ReportRow } from './report-table';
describe('Financial hierarchy and sorting', () => {
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
