import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AttributeBulk } from './attribute-bulk';
describe('Copying an existing card attribute', () => {
  it('copies to the form without writing a card before preview and apply', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AttributeBulk);
    fixture.componentRef.setInput('offers', ['A', 'B']);
    const bulk = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    bulk.category.set({
      description_category_id: 100,
      type_id: 200,
      category_name: 'Категория',
      type_name: 'Тип',
      path: null,
    });
    bulk.definition.set({
      attribute_id: 1,
      name: 'Бренд',
      dictionary_id: 501,
      is_required: true,
      is_collection: false,
      max_value_count: 1,
      attribute_complex_id: 0,
    } as never);
    bulk.sourceOffer.setValue('A');
    bulk.copyFromSource();
    http
      .expectOne((r) => r.url === '/v2/api/cards-v2/workspace')
      .flush({
        working_copy: {
          description_category_id: 100,
          type_id: 200,
          attributes: [{ id: 1, values: [{ dictionary_value_id: 11, value: 'Docke' }] }],
        },
      });
    expect(bulk.value()?.values[0].dictionary_value_id).toBe(11);
    http.expectNone('/v2/api/cards-v2/attributes/apply');
    http.expectNone('/v2/api/cards-v2/save');
    http.verify();
  });
  it('blocks an expired attribute preview before sending an apply', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AttributeBulk);
    fixture.componentRef.setInput('offers', ['A']);
    fixture.componentInstance.preview.set({
      operation_id: 'old',
      expires_at: '2020-01-01T00:00:00Z',
    } as never);
    fixture.componentInstance.apply();
    TestBed.inject(HttpTestingController).expectNone('/v2/api/cards-v2/attributes/apply');
    expect(fixture.componentInstance.error()).toContain('истёк');
  });
});
