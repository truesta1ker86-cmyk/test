import { WarehousePickerModule } from './warehouse-picker.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FilterMultiselectComponent } from '../../../../../shared/directives/filter-panel/components/filter-multiselect/filter-multiselect.component';
import { WarehousePickerComponent } from './warehouse-picker.component';

describe('Selecting warehouse columns', () => {
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
    picker.applySelection();
    expect(emitted).toEqual([['0', '1', '2']]);
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
    picker.applySelection();
    expect(emitted[0]).toHaveLength(12);
    expect(emitted[0].at(-1)).toBe('12');
  });
  it('does not add unavailable or removed warehouses after the catalog changes', () => {
    const { fixture, picker, emitted } = setup();
    picker.toggleWarehouseSelection('1', true);
    fixture.componentRef.setInput('warehouses', [
      { warehouse_id: '1', warehouse_name: 'One', available: false },
    ]);
    picker.applySelection();
    expect(emitted).toEqual([[]]);
  });
  it('removes applied columns, including all columns, without re-adding them', async () => {
    const { fixture, picker, emitted } = setup();
    await fixture.whenStable();
    picker.togglePopover();
    await fixture.whenStable();
    const option = fixture.nativeElement.querySelector('[role="option"]') as HTMLElement;
    option.click();
    await fixture.whenStable();
    expect(picker.tempSelected).toEqual([]);
    expect(picker.hasChanges).toBe(true);
    expect(option.getAttribute('aria-selected')).toBe('false');
    picker.applySelection();
    expect(emitted).toEqual([[]]);
    fixture.componentRef.setInput('selectedWarehouseIds', []);
    await fixture.whenStable();
    picker.togglePopover();
    expect(picker.tempSelected).toEqual([]);
  });
  it('cancels removals and additions without changing the table', () => {
    const { picker, emitted } = setup();
    picker.togglePopover();
    picker.selectionChanged(['1', '2']);
    picker.closePopover();
    picker.togglePopover();
    expect(picker.tempSelected).toEqual(['0']);
    expect(emitted).toEqual([]);
  });
  it('replaces a warehouse at the twelve-column limit', () => {
    const { fixture, picker, emitted } = setup();
    fixture.componentRef.setInput(
      'selectedWarehouseIds',
      Array.from({ length: 12 }, (_, i) => String(i)),
    );
    picker.togglePopover();
    picker.toggleWarehouseSelection('0', false);
    picker.toggleWarehouseSelection('12', true);
    picker.applySelection();
    expect(emitted[0]).toHaveLength(12);
    expect(emitted[0]).not.toContain('0');
    expect(emitted[0]).toContain('12');
  });
  it('uses the shared inline filter and retains selected warehouses while searching', async () => {
    const { fixture, picker } = setup();
    await fixture.whenStable();
    picker.togglePopover();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(picker.tempSelected).toEqual(['0']);
    expect(
      fixture.debugElement.query(By.directive(FilterMultiselectComponent)).componentInstance.value,
    ).toEqual(['0']);
    expect(root.querySelector('p-select')).toBeNull();
    const options = [...root.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options[0].getAttribute('aria-disabled')).toBe('false');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[0].textContent).toContain('В таблице');
    options[1].click();
    await fixture.whenStable();
    options[2].click();
    await fixture.whenStable();
    expect(picker.tempSelected).toEqual(['0', '1', '2']);
    const search = root.querySelector<HTMLInputElement>('input.p-listbox-filter')!;
    search.value = 'Warehouse 2';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(root.querySelectorAll('[role="option"]').length).toBe(1);
    expect(picker.tempSelected).toEqual(['0', '1', '2']);
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [WarehousePickerModule] }));
