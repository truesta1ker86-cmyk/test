import { TestBed } from '@angular/core/testing';
import { StockChoiceFilter } from './stock-choice';
describe('Stock multiselect', () => {
  function setup() {
    const fixture = TestBed.createComponent(StockChoiceFilter);
    fixture.componentRef.setInput('label', 'Бренд');
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'Docke' },
      { value: 'b', label: 'Grand Line' },
      { value: 'c', label: 'Третий' },
    ]);
    fixture.componentRef.setInput('values', ['a']);
    const emitted: string[][] = [];
    fixture.componentInstance.valuesChange.subscribe((value) => emitted.push(value));
    return { fixture, component: fixture.componentInstance, emitted };
  }
  it('cancel does not change the applied selection', () => {
    const { component, emitted } = setup();
    component.open();
    component.toggle('b', true);
    component.cancel();
    expect(emitted).toEqual([]);
    component.open();
    expect([...component.draft()]).toEqual(['a']);
  });
  it('applies several choices together and preserves hidden selected choices during search', () => {
    const { component, emitted } = setup();
    component.open();
    component.search.set('Grand');
    component.selectFound();
    component.apply();
    expect(emitted).toEqual([['a', 'b']]);
  });
  it('does not silently turn an empty selection into all values', () => {
    const { component, emitted } = setup();
    component.open();
    component.toggleAll(false);
    component.apply();
    expect(emitted).toEqual([]);
    expect(component.error()).toContain('Все значения');
    expect(component.opened()).toBe(true);
    component.toggleAll(true);
    component.apply();
    expect(emitted).toEqual([[]]);
  });
  it('starts with all checked and narrows to found values, as in v1', () => {
    const { fixture, component, emitted } = setup();
    fixture.componentRef.setInput('values', []);
    component.open();
    expect(component.allValues()).toBe(true);
    expect(component.draft().size).toBe(3);
    component.search.set('Grand');
    component.selectFound();
    component.apply();
    expect(emitted).toEqual([['b']]);
  });
  it('keeps applied choices missing from the current options', () => {
    const { fixture, component, emitted } = setup();
    fixture.componentRef.setInput('values', ['unlisted']);
    component.open();
    component.toggle('b', true);
    component.apply();
    expect(emitted).toEqual([['b', 'unlisted']]);
  });
});
