import { TestBed } from '@angular/core/testing';
import { DataTableFilterModule } from '../../data-table-filter.module';
import { DataTableToolbarFilterComponent } from './data-table-toolbar-filter.component';

describe('Shared table toolbar filters', () => {
  async function setup(withLifecycle = false) {
    TestBed.configureTestingModule({ imports: [DataTableFilterModule] });
    const fixture = TestBed.createComponent(DataTableToolbarFilterComponent);
    fixture.componentRef.setInput('filter', {
      q: 'OLD',
      status: 'delivered',
      scheme: 'fbo',
      lifecycle: withLifecycle ? 'completed' : '',
      start: '2026-10-01',
      end: '2026-10-26',
      page: 3,
      page_size: 25,
      sort: 'amount_desc',
      column_filters: '{"amount":{"min":"1000"}}',
    });
    fixture.componentRef.setInput('sorts', [{ value: 'date_desc', label: 'Сначала новые' }]);
    if (withLifecycle) {
      fixture.componentRef.setInput('lifecycles', [
        { value: 'current', label: 'Текущие' },
        { value: 'completed', label: 'Завершённые' },
      ]);
      fixture.componentRef.setInput('statuses', [{ value: '', label: 'Все статусы' }]);
      fixture.componentRef.setInput('schemes', [{ value: '', label: 'Все схемы' }]);
    }
    const changes = vi.fn();
    fixture.componentInstance.filterChange.subscribe(changes);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement, changes };
  }

  it('applies a search while preserving column conditions and resetting pagination', async () => {
    const { fixture, root, changes } = await setup();
    const input = root.querySelector<HTMLInputElement>('app-filter-text input')!;
    input.value = 'RETURN-42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    root
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(changes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: 'RETURN-42',
        page: 1,
        page_size: 25,
        lifecycle: '',
        column_filters: '{"amount":{"min":"1000"}}',
      }),
    );
  });

  it.each([false, true])(
    'resets only to the defaults supplied by the page (lifecycle: %s)',
    async (withLifecycle) => {
      const { root, changes } = await setup(withLifecycle);
      expect(root.querySelector('app-filter-select[key=lifecycle]') !== null).toBe(withLifecycle);
      const reset = [...root.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Сбросить',
      )!;
      reset.click();
      expect(changes).toHaveBeenLastCalledWith({
        q: '',
        status: '',
        scheme: '',
        lifecycle: withLifecycle ? 'current' : '',
        start: '',
        end: '',
        page: 1,
        page_size: 25,
        sort: 'date_desc',
        column_filters: '',
      });
    },
  );

  it('restores a changed URL filter without emitting another navigation', async () => {
    const { fixture, root, changes } = await setup();
    fixture.componentRef.setInput('filter', {
      ...fixture.componentInstance.filter,
      q: 'BACK',
      page: 2,
    });
    await fixture.whenStable();
    expect(root.querySelector<HTMLInputElement>('app-filter-text input')!.value).toBe('BACK');
    expect(changes).not.toHaveBeenCalled();
  });

  it('keeps an unfinished search when loading and status choices change', async () => {
    const { fixture, root, changes } = await setup(true);
    const input = root.querySelector<HTMLInputElement>('app-filter-text input')!;
    input.value = 'DRAFT';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('statuses', [{ value: '', label: 'Все текущие статусы' }]);
    await fixture.whenStable();
    expect(input.value).toBe('DRAFT');
    expect(changes).not.toHaveBeenCalled();
  });
});
