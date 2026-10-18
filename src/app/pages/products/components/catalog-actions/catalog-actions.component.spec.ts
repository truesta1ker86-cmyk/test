import { CatalogActionsModule } from './catalog-actions.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CatalogActions } from './catalog-actions.component';

describe('v1 catalog finance and promotion actions', () => {
  function setup(kind: 'finance' | 'promotion') {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CatalogActions);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('offers', ['A', 'B']);
    return {
      fixture,
      component: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
    };
  }
  it('only changes enabled FIN fields and converts a percent without changing category', () => {
    const { component, http } = setup('finance');
    component.form.patchValue({
      financeTypeEnabled: true,
      financeType: 'Новый FIN',
      marginEnabled: true,
      margin: '34,67',
      financeCategory: 'Не отмечена',
    });
    component.check();
    const request = http.expectOne('/v2/api/catalog-v2/preview');
    expect(request.request.body.changes).toEqual({
      report_type: 'Новый FIN',
      fixed_margin: '0.3467',
    });
    request.flush({ status: 'preview', operation_id: 'x' });
    http.verify();
  });
  it('distinguishes model zero from category inheritance', () => {
    const { component, http } = setup('promotion');
    component.form.controls.promotionModel.setValue('0');
    component.check();
    const first = http.expectOne('/v2/api/catalog-v2/preview');
    expect(first.request.body.changes).toEqual({ promotion_model: 0 });
    first.flush({});
    component.form.controls.promotionModel.setValue('');
    component.check();
    const second = http.expectOne('/v2/api/catalog-v2/preview');
    expect(second.request.body.changes).toEqual({ promotion_model: null });
    second.flush({});
    http.verify();
  });
  it('blocks applying an expired preview without posting a write', () => {
    const { component, http } = setup('finance');
    component.preview.set({ operation_id: 'expired', expires_at: '2020-01-01T00:00:00Z' } as never);
    component.apply();
    http.expectNone('/v2/api/catalog-v2/apply');
    expect(component.error()).toContain('истёк');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [CatalogActionsModule] }));
