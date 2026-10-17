import { TestBed } from '@angular/core/testing';
import { WarehousePicker } from './warehouse-picker';

describe('Adding warehouse columns', () => {
  function setup() {
    const fixture = TestBed.createComponent(WarehousePicker);
    fixture.componentRef.setInput(
      'warehouses',
      Array.from({ length: 14 }, (_, i) => ({
        warehouse_id: String(i),
        warehouse_name: 'Warehouse ' + i,
      })),
    );
    fixture.componentRef.setInput('added', ['0']);
    const emitted: string[][] = [];
    fixture.componentInstance.addedChange.subscribe((value) => emitted.push(value));
    return { fixture, picker: fixture.componentInstance, emitted };
  }
  it('stages several new columns and adds them once without duplicating existing warehouses', () => {
    const { picker, emitted } = setup();
    picker.toggle('0', true);
    picker.toggle('1', true);
    picker.toggle('2', true);
    expect(emitted).toEqual([]);
    expect([...picker.pending()]).toEqual(['1', '2']);
    picker.add();
    expect(emitted).toEqual([['0', '1', '2']]);
    expect(picker.pending().size).toBe(0);
    expect(picker.opened()).toBe(false);
  });
  it('limits visible columns to twelve and allows removing a pending choice', () => {
    const { fixture, picker, emitted } = setup();
    fixture.componentRef.setInput(
      'added',
      Array.from({ length: 11 }, (_, i) => String(i)),
    );
    picker.toggle('11', true);
    picker.toggle('12', true);
    expect([...picker.pending()]).toEqual(['11']);
    picker.toggle('11', false);
    picker.toggle('12', true);
    picker.add();
    expect(emitted[0]).toHaveLength(12);
    expect(emitted[0].at(-1)).toBe('12');
  });
  it('does not add unavailable or removed warehouses after the catalog changes', () => {
    const { fixture, picker, emitted } = setup();
    picker.toggle('1', true);
    fixture.componentRef.setInput('warehouses', [
      { warehouse_id: '1', warehouse_name: 'One', available: false },
    ]);
    picker.add();
    expect(emitted).toEqual([['0']]);
  });
});
