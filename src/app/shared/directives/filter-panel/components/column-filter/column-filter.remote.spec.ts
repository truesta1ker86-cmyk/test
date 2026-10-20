import { TestBed } from '@angular/core/testing';
import { ColumnFilterModule } from './column-filter.module';
import { ColumnFilterComponent } from './column-filter.component';
import type { ColumnValuesRequest } from '../../infrastructure/interfaces/column-rule.interfaces';

describe('Remote column value choices', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  });
  afterAll(() => {
    delete (HTMLDialogElement.prototype as any).showModal;
  });
  async function setup() {
    TestBed.configureTestingModule({ imports: [ColumnFilterModule] });
    const fixture = TestBed.createComponent(ColumnFilterComponent);
    fixture.componentRef.setInput('field', 'posting_number');
    fixture.componentRef.setInput('label', 'Номер');
    fixture.componentRef.setInput('remoteOptions', true);
    await fixture.whenStable();
    return fixture;
  }
  it('requests values on open and preserves the draft while another values page loads', async () => {
    const fixture = await setup(),
      component = fixture.componentInstance;
    const requests: ColumnValuesRequest[] = [];
    component.optionsRequested.subscribe((value) => requests.push(value));
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(requests).toEqual([{ search: '', page: 1 }]);
    component.filters.updateFilters({ text: 'PAGE', choice_search: '120', values: ['PAGE-120'] });
    fixture.componentRef.setInput('options', ['PAGE-119', 'PAGE-120']);
    await fixture.whenStable();
    expect(component.filters.getValue('text')).toBe('PAGE');
    expect(component.filters.getValue('values')).toEqual(['PAGE-120']);
    component.requestValues(2);
    expect(requests.at(-1)).toEqual({ search: '120', page: 2 });
    fixture.componentRef.setInput('optionsBusy', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Загрузка');
    expect(
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (button: any) => button.textContent.trim() === 'Применить',
      )?.disabled,
    ).toBe(true);
  });
  it('keeps explicit choices restricted even if they cover the currently loaded values page', async () => {
    const fixture = await setup(),
      component = fixture.componentInstance;
    fixture.componentRef.setInput('options', ['ONLY-PAGE-2']);
    component.open();
    await fixture.whenStable();
    const changes: any[] = [];
    component.changed.subscribe((value) => changes.push(value));
    component.filters.updateFilter('values', ['ONLY-PAGE-2']);
    component.apply();
    expect(changes[0].rule.values).toEqual(['ONLY-PAGE-2']);
    component.open();
    await fixture.whenStable();
    component.filters.updateFilter('values', []);
    component.apply();
    expect(changes[1].rule.values).toEqual([]);
  });
});
