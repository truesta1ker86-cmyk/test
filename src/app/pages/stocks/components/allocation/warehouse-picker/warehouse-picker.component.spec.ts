import { WarehousePickerModule } from './warehouse-picker.module';
import { TestBed } from '@angular/core/testing';
import { WarehousePickerComponent } from './warehouse-picker.component';

describe('Adding warehouse columns', () => {
  function setup() {
    const fixture = TestBed.createComponent(WarehousePickerComponent);
    fixture.componentRef.setInput(
      'warehouses',
      Array.from({ length: 14 }, (_, i) => ({
        warehouse_id: String(i),
        warehouse_name: 'Warehouse ' + i,
      })),
    );
    fixture.componentRef.setInput('selectedWarehouseIds', ['0']);
    const emitted: string[][] = [];
    fixture.componentInstance.warehousesChange.subscribe((value) => emitted.push(value));
    return { fixture, picker: fixture.componentInstance, emitted };
  }
  it('stages several new columns and adds them once without duplicating existing warehouses', () => {
    const { picker, emitted } = setup();
    picker.toggleWarehouseSelection('0', true);
    picker.toggleWarehouseSelection('1', true);
    picker.toggleWarehouseSelection('2', true);
    expect(emitted).toEqual([]);
    expect([
      ...picker.tempSelected.filter((id) => !picker.selectedWarehouseIds.includes(id)),
    ]).toEqual(['1', '2']);
    picker.addSelectedWarehouses();
    expect(emitted).toEqual([['0', '1', '2']]);
    expect(picker.selectedCount).toBe(0);
    expect(picker.popoverOpen).toBe(false);
  });
  it('limits visible columns to twelve and allows removing a pending choice', () => {
    const { fixture, picker, emitted } = setup();
    fixture.componentRef.setInput(
      'selectedWarehouseIds',
      Array.from({ length: 11 }, (_, i) => String(i)),
    );
    picker.toggleWarehouseSelection('11', true);
    picker.toggleWarehouseSelection('12', true);
    expect([
      ...picker.tempSelected.filter((id) => !picker.selectedWarehouseIds.includes(id)),
    ]).toEqual(['11']);
    picker.toggleWarehouseSelection('11', false);
    picker.toggleWarehouseSelection('12', true);
    picker.addSelectedWarehouses();
    expect(emitted[0]).toHaveLength(12);
    expect(emitted[0].at(-1)).toBe('12');
  });
  it('does not add unavailable or removed warehouses after the catalog changes', () => {
    const { fixture, picker, emitted } = setup();
    picker.toggleWarehouseSelection('1', true);
    fixture.componentRef.setInput('warehouses', [
      { warehouse_id: '1', warehouse_name: 'One', available: false },
    ]);
    picker.addSelectedWarehouses();
    expect(emitted).toEqual([]);
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [WarehousePickerModule] }));
