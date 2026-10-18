import { MarginRulesModule } from './margin-rules.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MarginRules } from './margin-rules.component';

describe('v1 category and FIN rules', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(MarginRules);
    fixture.componentRef.setInput('categories', [
      {
        description_category_id: 100,
        type_id: 200,
        category_label: 'Водосток',
        type_label: 'Желоб',
      },
      {
        description_category_id: 100,
        type_id: 201,
        category_label: 'Водосток',
        type_label: 'Кронштейн',
      },
    ]);
    return {
      fixture,
      rules: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
    };
  }
  it('saves the whole category with type zero and recalculates only that category', () => {
    const { rules, http } = setup();
    expect(rules.categoryOptions().length).toBe(1);
    rules.form.controls.category.setValue('100');
    rules.form.controls.margin.setValue('35');
    rules.save();
    const save = http.expectOne('/v2/api/pricing/category-margin');
    expect(save.request.body).toEqual({ description_category_id: 100, type_id: 0, margin: '0.35' });
    save.flush({ saved: true });
    const recalc = http.expectOne('/v2/api/pricing/editor/recalc');
    expect(recalc.request.body.scope).toEqual({ filters: { description_category_id: 100 } });
    recalc.flush({ total: 2, recalculated: 2, failed: 0 });
    http.verify();
  });
  it('uses the exact report group and keeps the scope reference stable for a frozen preview', () => {
    const { rules, http } = setup();
    rules.form.controls.fin_type.setValue('Водосток');
    expect(rules.finScope()).toEqual({ filters: { report_type: 'Водосток' } });
    expect(rules.finScope()).toBe(rules.finScope());
    http.expectNone('/v2/api/pricing/margin');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [MarginRulesModule] }));
