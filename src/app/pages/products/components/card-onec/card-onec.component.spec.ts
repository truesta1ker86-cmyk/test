import { CardOneCModule } from './card-onec.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CardOneC } from './card-onec.component';

const candidate = {
  onec_code: '0001',
  sku_1c: 'A',
  onec_name: 'Товар 1С',
  available: 46,
  selected_cost: '280',
  is_verified: true,
  base_units: 1,
  warehouse_count: 2,
};

function setup(local = true) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(CardOneC),
    page = fixture.componentInstance,
    http = TestBed.inject(HttpTestingController);
  fixture.componentRef.setInput('localPreview', local);
  fixture.componentRef.setInput('canManage', true);
  fixture.componentRef.setInput('row', {
    offer_id: 'A',
    version: '3',
    onec_code: '0001',
    units_per_item: 2,
    package_cost: '300',
  });
  fixture.detectChanges();
  if (local)
    http
      .expectOne('/v2/api/catalog-v2/mapping/snapshot')
      .flush({ items: [candidate], local_preview: true });
  fixture.detectChanges();
  return { fixture, page, http };
}

describe('Constructor 1C binding from the local snapshot', () => {
  it('resolves an unambiguous legacy article but requires an exact code for duplicates', () => {
    const { page, http } = setup();
    page.choose('A');
    expect(page.candidate()?.onec_code).toBe('0001');
    page.candidates.update((c) => [...c, { ...candidate, onec_code: 'OTHER' }]);
    expect(page.candidate()).toBeUndefined();
    page.choose('0001');
    expect(page.candidate()?.onec_code).toBe('0001');
    http.verify();
  });
  it('uses raw physical units and preserves current API package cost', () => {
    const { page, http } = setup();
    page.units.set('5');
    expect(page.sellable()).toBe(9);
    expect(page.packageCost()).toBe(300);
    http.verify();
  });
  it('does not send writes for invalid quant, readonly or nonlocal mode', () => {
    const { page, http, fixture } = setup();
    page.units.set('2.5');
    page.save();
    expect(page.error()).toContain('целое');
    page.units.set('2');
    fixture.componentRef.setInput('canManage', false);
    page.save();
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
  it('never loads or saves without the local preview boundary', () => {
    const { page, http } = setup(false);
    page.save();
    http.expectNone(() => true);
    http.verify();
  });
  it('previews exact code/version and applies once before continuing', () => {
    const { page, http } = setup();
    const saved = vi.fn();
    page.saved.subscribe(saved);
    page.save();
    page.save();
    const request = http.expectOne('/v2/api/catalog-v2/mapping/preview');
    expect(request.request.body.items[0]).toEqual({
      offer_id: 'A',
      identity: '0001',
      onec_code: '0001',
      units_per_item: 2,
      expected_version: '3',
    });
    request.flush({ operation_id: 'OP' });
    http.expectOne('/v2/api/catalog-v2/apply').flush({ applied: 1 });
    expect(saved).toHaveBeenCalledOnce();
    expect(page.busy()).toBe(false);
    http.verify();
  });
  it('does not apply a late preview for another open product', () => {
    const { page, http, fixture } = setup();
    page.save();
    const old = http.expectOne('/v2/api/catalog-v2/mapping/preview');
    fixture.componentRef.setInput('row', { offer_id: 'B', version: '1' });
    fixture.detectChanges();
    old.flush({ operation_id: 'OP' });
    http.expectNone('/v2/api/catalog-v2/apply');
    expect(page.busy()).toBe(false);
    http.verify();
  });
  it('emits creation choice without writing a binding before a draft exists', () => {
    const { page, http, fixture } = setup();
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();
    const chosen = vi.fn();
    page.createRequested.subscribe(chosen);
    page.save();
    expect(chosen).toHaveBeenCalledWith({ onec_code: '0001', units_per_item: 2, name: 'Товар 1С' });
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [CardOneCModule] }));
