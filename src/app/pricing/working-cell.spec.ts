import { TestBed } from '@angular/core/testing';
import { PricingWorkingCell } from './working-cell';

describe('v1 immediate working value editor', () => {
  function setup(field: 'price' | 'min_price' | 'margin') {
    const fixture = TestBed.createComponent(PricingWorkingCell);
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('offer', 'A');
    fixture.componentRef.setInput('label', 'Значение');
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    return { cell: fixture.componentInstance, changed };
  }
  it('normalizes percentages and rejects an impossible margin without emitting a write', () => {
    const { cell, changed } = setup('margin');
    cell.draft.set('34,67');
    cell.commit();
    expect(changed).toHaveBeenLastCalledWith({ field: 'margin', value: '0.3467', reset: false });
    changed.mockClear();
    cell.draft.set('100');
    cell.commit();
    expect(changed).not.toHaveBeenCalled();
    expect(cell.error()).toContain('меньше 100%');
  });
  it('resets a cleared minimum and cancels without emitting a write', () => {
    const { cell, changed } = setup('min_price');
    cell.draft.set('');
    cell.commit();
    expect(changed).toHaveBeenLastCalledWith({ field: 'min_price', value: null, reset: true });
    changed.mockClear();
    cell.begin();
    cell.draft.set('700');
    cell.cancel();
    expect(changed).not.toHaveBeenCalled();
    expect(cell.opened()).toBe(false);
  });
});
