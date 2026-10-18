import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InventoryReconciliationModule } from './inventory-reconciliation.module';
import { InventoryReconciliationComponent } from './inventory-reconciliation.component';

describe('Original inventory reconciliation with service business columns', () => {
  it('renders every fact, reservation, safety and status column through the original table', async () => {
    TestBed.configureTestingModule({
      imports: [InventoryReconciliationModule],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(InventoryReconciliationComponent);
    fixture.componentRef.setInput('items', [
      {
        offer_id: 'A',
        product_name: 'Товар',
        physical_1c: 10,
        physical_1c_base: 20,
        units_per_item: 2,
        reserved_1c: 1,
        reserved_1c_base: 2,
        protected_fbs_orders: 3,
        calculated_publishable: 6,
        safe_publishable: 6,
        ozon_fbs_available: 8,
        ozon_fbs_reserved: 2,
        difference: -2,
        status: 'matched',
      },
    ]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement,
      cells = root.querySelectorAll('tbody tr:first-child td');
    expect(root.querySelectorAll('thead th')).toHaveLength(11);
    expect(cells).toHaveLength(11);
    expect(cells[4].textContent).toContain('3');
    expect(cells[6].textContent?.trim()).toBe('6');
    expect(cells[8].textContent?.trim()).toBe('2');
    expect(cells[10].textContent).toContain('Совпадает');
    expect(root.querySelector('app-data-table p-table')).not.toBeNull();
  });
});
