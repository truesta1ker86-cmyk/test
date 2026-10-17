import { TestBed } from '@angular/core/testing';
import { FinanceColumnFilter, financeRules } from './finance-column-filter';
describe('Financial column selection', () => {
  function setup() {
    const fixture = TestBed.createComponent(FinanceColumnFilter);
    fixture.componentRef.setInput('field', 'cost');
    fixture.componentRef.setInput('label', 'Себестоимость');
    fixture.componentRef.setInput('options', ['100', '300']);
    const change = vi.fn();
    fixture.componentInstance.changed.subscribe(change);
    return { component: fixture.componentInstance, change };
  }
  it('distinguishes choosing no values from removing the filter', () => {
    const { component, change } = setup();
    component.open();
    component.chosen.set([]);
    component.apply();
    expect(change).toHaveBeenLastCalledWith({
      field: 'cost',
      rule: { values: [], text: '', operator: 'contains', min: '', max: '' },
    });
    component.open();
    component.chosen.set(component.allValues());
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'cost', rule: null });
  });
  it('normalizes decimal bounds and blocks a reversed range', () => {
    const { component, change } = setup();
    component.open();
    component.draft.min = ' 10,5 ';
    component.draft.max = '20';
    component.apply();
    expect(change.mock.calls[0][0].rule.min).toBe('10.5');
    change.mockClear();
    component.open();
    component.draft.min = '50';
    component.draft.max = '20';
    component.apply();
    expect(change).not.toHaveBeenCalled();
    expect(component.error()).toContain('диапазон');
  });
  it('keeps a malformed URL from crashing the table', () => {
    expect(financeRules('{')).toEqual({});
    expect(financeRules('null')).toEqual({});
  });
});
