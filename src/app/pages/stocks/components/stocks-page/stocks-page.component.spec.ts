import { StocksPageModule } from './stocks-page.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EMPTY } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { StocksPage } from './stocks-page.component';
import { AllocationMatrixComponent } from '../allocation/allocation-matrix/allocation-matrix.component';
import type { MatrixPreview } from '../../infrastructure/interfaces/contracts.interfaces';

describe('Allocation preview validity', () => {
  it('does not restore a saved-rule check for an older product selection', () => {
    const { page, http } = setup();
    page.selection.set(new Set(['A']));
    page.checkSavedRules();
    const request = http.expectOne('/v2/api/workspace-v2/stocks/run-preview');
    page.setSelection(new Set(['B']));
    request.flush({ dry_run: true, sends_enabled: false, pushed: 0, items: [] });
    expect(page.runPlan()).toBeNull();
    http.verify();
  });
  it('preserves newer edits when an earlier apply completes', () => {
    const { page, allocation, http } = setup();
    const reload = vi.spyOn(page, 'load').mockImplementation(() => {});
    allocation.change('A', 'W', 'percent', '50');
    page.preview.set(preview);
    page.applyMatrix();
    const request = http.expectOne('/v2/api/workspace-v2/stocks/matrix/apply');
    page.updateMatrix([{ ...page.matrix()[0], share: '0.7' }]);
    request.flush({ applied: 1 });
    expect(page.matrix()[0].share).toBe('0.7');
    expect(reload).toHaveBeenCalledOnce();
    http.verify();
  });
  it('retains invalid cell input when leaving and returning to the matrix tab', () => {
    const { fixture, page, allocation } = setup();
    allocation.change('A', 'W', 'percent', '-5');
    page.tab.set('rules');
    fixture.detectChanges();
    page.tab.set('matrix');
    fixture.detectChanges();
    const restored = fixture.debugElement.query(By.directive(AllocationMatrixComponent))
      .componentInstance as AllocationMatrixComponent;
    expect(page.matrixValid()).toBe(false);
    expect(restored.inputValue('A', 'W', 'percent')).toBe('-5');
  });
  it('discards a calculation response when its matrix draft has changed', () => {
    const { page, allocation, http } = setup();
    allocation.change('A', 'W', 'percent', '50');
    page.checkMatrix();
    const request = http.expectOne('/v2/api/workspace-v2/stocks/matrix/preview');
    page.updateMatrix([]);
    request.flush(preview);
    expect(page.preview()).toBeNull();
    http.verify();
  });
  it('discards an expected-receipt preview after a quantity changes', () => {
    const { page, http } = setup();
    page.selection.set(new Set(['B']));
    page.setArrival('2026-12-01');
    page.checkExpected();
    const request = http.expectOne('/v2/api/workspace-v2/stocks/expected/preview');
    page.setExpectedQty('B', 2);
    request.flush({
      operation_id: 'b'.repeat(32),
      arrival_date: '2026-12-01',
      products: 1,
      expected_qty: 1,
      distributed_qty: 1,
      unallocated_qty: 0,
      items: [],
    });
    expect(page.expectedPreview()).toBeNull();
    http.verify();
  });
  const preview: MatrixPreview = {
    operation_id: 'a'.repeat(32),
    rules: 1,
    creates: 1,
    updates: 0,
    physical_distribution_ready: true,
    missing_inventory_products: 0,
    requires_fake_confirmation: false,
    inventory: [],
    sample: [],
  };

  function setup() {
    TestBed.configureTestingModule({
      imports: [StocksPageModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: EMPTY } },
      ],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Test shop',
      actor_name: 'Tester',
      role: 'manager',
      is_owner: false,
      expires_in_seconds: 3600,
    });
    const fixture = TestBed.createComponent(StocksPage);
    const page = fixture.componentInstance;
    page.tab.set('matrix');
    fixture.detectChanges();
    const allocation = fixture.debugElement.query(By.directive(AllocationMatrixComponent))
      .componentInstance as AllocationMatrixComponent;
    return { fixture, page, allocation, http: TestBed.inject(HttpTestingController) };
  }

  it('invalidates a calculated preview when a cell receives invalid input', () => {
    const { page, allocation, http } = setup();
    allocation.change('A', 'W', 'percent', '50');
    page.preview.set(preview);
    page.confirmFake = true;
    allocation.change('A', 'W', 'percent', '-5');
    expect(page.matrixValid()).toBe(false);
    expect(page.preview()).toBeNull();
    expect(page.confirmFake).toBe(false);
    allocation.clearInvalidInputs();
    expect(page.matrixValid()).toBe(true);
    expect(page.preview()).toBeNull();
    expect(page.matrix()[0].share).toBe('0.5');
    http.verify();
  });

  it('does not submit a stale preview while inputs are invalid', () => {
    const { page, http } = setup();
    page.preview.set(preview);
    page.matrixValid.set(false);
    page.applyMatrix();
    http.expectNone('/v2/api/workspace-v2/stocks/matrix/apply');
    http.verify();
  });
});
