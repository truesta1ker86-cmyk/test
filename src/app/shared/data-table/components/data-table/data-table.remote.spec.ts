import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DataTableModule } from '../../data-table.module';
import { TABLE_DATA_SERVICE } from '../../infrastructure/tokens/table-data-source.token';
import { TablePage } from '../../infrastructure/interfaces/table-data-service';

@Component({
  imports: [DataTableModule],
  template: `<app-data-table
    entity="orders"
    [filters]="filters()"
    [refreshToken]="version()"
    [columns]="columns"
    selectionMode="none"
    [scrollable]="false"
    (dataError)="error = $event"
  />`,
})
class Host {
  filters = signal<{ q: string; page?: number; page_size?: number }>({ q: '' });
  version = signal(0);
  columns = [{ field: 'name', header: 'Товар' }];
  error: unknown;
}

describe('Paged table source', () => {
  function setup() {
    const pages: Subject<TablePage>[] = [];
    const listPage = vi.fn(() => {
      const page = new Subject<TablePage>();
      pages.push(page);
      return page;
    });
    TestBed.configureTestingModule({
      providers: [{ provide: TABLE_DATA_SERVICE, useValue: { listPage } }],
    });
    const fixture = TestBed.createComponent(Host);
    return { fixture, listPage, pages };
  }
  it('keeps a linked page, deduplicates its URL update and refreshes that same page', async () => {
    const { fixture, listPage, pages } = setup();
    fixture.componentInstance.filters.set({ q: '', page: 2, page_size: 25 });
    await fixture.whenStable();
    expect(listPage).toHaveBeenCalledTimes(1);
    expect(listPage).toHaveBeenLastCalledWith('orders', { q: '', page: 2, page_size: 25 }, 2, 25);
    pages[0].next({
      items: [{ id: 1, name: 'Вторая страница' }],
      meta: { total: 75, page: 2, page_size: 25 },
    });
    fixture.componentInstance.filters.set({ q: '', page: 2, page_size: 25 });
    await fixture.whenStable();
    expect(listPage).toHaveBeenCalledTimes(1);
    fixture.componentInstance.version.update((value) => value + 1);
    await fixture.whenStable();
    expect(listPage).toHaveBeenCalledTimes(2);
    expect(listPage).toHaveBeenLastCalledWith('orders', { q: '', page: 2, page_size: 25 }, 2, 25);
    expect(pages[1].observed).toBe(true);
    fixture.destroy();
    expect(pages[1].observed).toBe(false);
  });
  it('shows an accessible loader and blocks stale rows until the page finishes', async () => {
    const { fixture, pages } = setup();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.table-state')?.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('[role=status]')?.textContent).toContain('Загрузка');
    expect(root.textContent).not.toContain('Нет данных');
    expect(root.querySelectorAll('.table-skeleton span')).toHaveLength(4);
    pages[0].next({ items: [{ id: 1, name: 'Товар' }], meta: { total: 75 } });
    await fixture.whenStable();
    fixture.componentInstance.version.update((value) => value + 1);
    await fixture.whenStable();
    expect(root.querySelector('tbody tr')?.hasAttribute('inert')).toBe(true);
    pages[1].next({ items: [], meta: { total: 0 } });
    await fixture.whenStable();
    expect(root.querySelector('.table-state')?.getAttribute('aria-busy')).toBe('false');
    expect(root.textContent).toContain('Нет данных');
  });
  it('loads the first page once and renders its asynchronous result with OnPush', async () => {
    const { fixture, listPage, pages } = setup();
    await fixture.whenStable();
    expect(listPage).toHaveBeenCalledTimes(1);
    expect(listPage.mock.calls[0]).toEqual(['orders', { q: '', page: 1, page_size: 50 }, 1, 50]);
    pages[0].next({ items: [{ id: 1, name: 'Первый товар' }], meta: { total: 75 } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Первый товар');
    expect(fixture.nativeElement.querySelector('.p-paginator')).not.toBeNull();
  });
  it('cancels the previous selection request and clears stale rows on failure', async () => {
    const { fixture, pages } = setup();
    await fixture.whenStable();
    fixture.componentInstance.filters.set({ q: 'new' });
    await fixture.whenStable();
    expect(pages[0].observed).toBe(false);
    pages[0].next({ items: [{ name: 'Устаревший товар' }], meta: { total: 1 } });
    pages[1].error(new Error('unavailable'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Устаревший товар');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Повторите');
    expect(fixture.componentInstance.error).toBeInstanceOf(Error);
    fixture.destroy();
    expect(pages[1].observed).toBe(false);
  });
});
