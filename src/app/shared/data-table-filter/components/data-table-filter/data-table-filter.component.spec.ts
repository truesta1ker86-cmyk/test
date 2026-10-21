import { TestBed } from '@angular/core/testing';
import { DataTableFilterModule } from '../../data-table-filter.module';
import { DataTableFilterComponent } from './data-table-filter.component';

describe('One table-column popup', () => {
  const modal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  beforeAll(() =>
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    }),
  );
  afterAll(() =>
    modal
      ? Object.defineProperty(HTMLDialogElement.prototype, 'showModal', modal)
      : Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'),
  );

  async function setup(remote = false) {
    TestBed.configureTestingModule({ imports: [DataTableFilterModule] });
    const fixture = TestBed.createComponent(DataTableFilterComponent);
    fixture.componentRef.setInput('field', 'offer_id');
    fixture.componentRef.setInput('label', 'Артикул');
    fixture.componentRef.setInput('options', ['ONE', 'TWO']);
    fixture.componentRef.setInput('counts', { ONE: 3, TWO: 1 });
    fixture.componentRef.setInput('remoteOptions', remote);
    const changes = vi.fn();
    fixture.componentInstance.changed.subscribe(changes);
    fixture.componentInstance.open();
    await fixture.whenStable();
    return {
      fixture,
      component: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
      changes,
    };
  }

  it('shows the screenshot structure without a nested multiselect popup', async () => {
    const { root } = await setup();
    expect(root.querySelector('dialog h3')?.textContent).toBe('Артикул');
    expect(root.querySelector('app-filter-multiselect')).toBeNull();
    expect(root.querySelectorAll('.values-list input[type=checkbox]').length).toBe(3);
    expect(root.querySelector('.values-list')?.textContent).toMatch(/ONE\s*\(3\)/);
    expect([...root.querySelectorAll('footer button')].map((b) => b.textContent?.trim())).toEqual([
      'Сбросить',
      'Отмена',
      'Применить',
    ]);
    expect(
      root
        .querySelector('.values-list')!
        .compareDocumentPosition(root.querySelector('.text-condition')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('searches all options, selects found values and cancels without changing the committed rule', async () => {
    const { fixture, component, root, changes } = await setup();
    const search = root.querySelector<HTMLInputElement>(
      'app-filter-text[key=choice_search] input',
    )!;
    search.value = 'TWO';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    component.selectFound();
    expect(component.state.values()).toEqual(['TWO']);
    component.close();
    expect(changes).not.toHaveBeenCalled();
    component.open();
    expect(component.state.values()).toBeNull();
    component.state.all(false);
    component.apply();
    expect(changes.mock.lastCall![0].rule.values).toEqual([]);
  });

  it('keeps all except one as an exclusion across unloaded remote pages', async () => {
    const { root, component, changes } = await setup(true);
    const input = root.querySelectorAll<HTMLInputElement>('.values-list input')[1];
    input.checked = false;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    component.apply();
    expect(changes.mock.lastCall![0].rule).toEqual({
      values: null,
      excluded_values: ['ONE'],
      text: '',
      operator: 'contains',
      min: '',
      max: '',
    });
  });

  it('selects all found remote pages instead of only the currently visible page', async () => {
    const { fixture, component } = await setup(true);
    const requests = vi.fn();
    component.optionsRequested.subscribe(requests);
    component.filters.updateFilter('choice_search', 'PAGE');
    component.requestValues(1, true);
    fixture.componentRef.setInput('options', ['PAGE-1']);
    fixture.componentRef.setInput('optionsTotal', 2);
    fixture.componentRef.setInput('optionsHasMore', true);
    await fixture.whenStable();
    component.selectFound();
    expect(requests.mock.lastCall![0]).toEqual({ search: 'PAGE', page: 2 });
    fixture.componentRef.setInput('options', ['PAGE-2']);
    fixture.componentRef.setInput('optionsHasMore', false);
    await fixture.whenStable();
    expect(component.state.values()).toEqual(['PAGE-1', 'PAGE-2']);
  });

  it('does not mix an old paged search into a newly typed search', async () => {
    const { fixture, component } = await setup(true);
    component.filters.updateFilter('choice_search', 'OLD');
    component.requestValues(1, true);
    fixture.componentRef.setInput('options', ['OLD-1']);
    fixture.componentRef.setInput('optionsTotal', 2);
    fixture.componentRef.setInput('optionsHasMore', true);
    await fixture.whenStable();
    component.selectFound();
    component.filters.updateFilter('choice_search', 'NEW');
    fixture.componentRef.setInput('options', ['OLD-2']);
    fixture.componentRef.setInput('optionsHasMore', false);
    await fixture.whenStable();
    expect(component.state.values()).toBeNull();
    expect(component.valuesBusy()).toBe(true);
    component.requestValues(1, true);
    fixture.componentRef.setInput('options', ['NEW-1']);
    fixture.componentRef.setInput('optionsTotal', 1);
    await fixture.whenStable();
    component.selectFound();
    expect(component.state.values()).toEqual(['NEW-1']);
  });

  it('bounds rendered checkboxes while searching through the complete source', async () => {
    const { fixture, component, root, changes } = await setup();
    fixture.componentRef.setInput(
      'options',
      Array.from({ length: 5000 }, (_, i) => 'SKU-' + i),
    );
    await fixture.whenStable();
    expect(root.querySelectorAll('.values-list input').length).toBeLessThanOrEqual(101);
    component.filters.updateFilter('choice_search', 'SKU-4999');
    await fixture.whenStable();
    expect(root.querySelector('.values-list')?.textContent).toContain('SKU-4999');
    component.selectFound();
    component.apply();
    expect(changes.mock.lastCall![0].rule.values).toEqual(['SKU-4999']);
  });
});
