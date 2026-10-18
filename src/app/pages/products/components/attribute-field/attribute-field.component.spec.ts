import { AttributeFieldModule } from './attribute-field.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AttributeField } from './attribute-field.component';

describe('Cached card dictionaries', () => {
  it('discards values returned after a category and dictionary change', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AttributeField);
    const definition = {
      attribute_id: 1,
      name: 'Бренд',
      dictionary_id: 501,
      is_required: true,
      is_collection: false,
      max_value_count: 1,
      attribute_complex_id: 0,
    };
    fixture.componentRef.setInput('definition', definition);
    fixture.componentRef.setInput('category', 100);
    fixture.componentRef.setInput('type', 200);
    fixture.detectChanges();
    const field = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    field.find();
    const old = http.expectOne((r) => r.url === '/v2/api/cards-v2/dictionary');
    fixture.componentRef.setInput('category', 101);
    fixture.componentRef.setInput('type', 202);
    fixture.componentRef.setInput('definition', { ...definition, dictionary_id: 601 });
    fixture.detectChanges();
    old.flush({ items: [{ id: 11, value: 'Старый бренд' }], source: 'local', has_next: false });
    expect(field.values()).toEqual([]);
    field.find();
    const next = http.expectOne((r) => r.url === '/v2/api/cards-v2/dictionary');
    expect(next.request.params.get('category_id')).toBe('101');
    next.flush({ items: [{ id: 31, value: 'Тест' }], source: 'local', has_next: false });
    expect(field.values()[0].id).toBe(31);
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [AttributeFieldModule] }));
