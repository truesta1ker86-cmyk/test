import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataTableModule } from '../../data-table.module';

@Component({
  imports: [DataTableModule],
  template: `<app-data-table
    [columns]="columns"
    [data]="rows"
    [lazy]="false"
    [scrollable]="false"
    selectionMode="multiple"
    dataKey="offer_id"
    (selectionChange)="selected = $event"
    (rowClick)="opened = $event"
  >
    <ng-template #cellTemplate let-row let-column="column">
      @if (column.field === 'name') {
        <button (click)="edited = row; $event.stopPropagation()">{{ row.name }}</button>
      }
    </ng-template>
  </app-data-table>`,
})
class Host {
  columns = [
    { field: 'offer_id', header: 'Артикул', sortable: true },
    { field: 'name', header: 'Название', cellTemplate: true },
  ];
  rows = [
    { offer_id: 'B', name: 'Товар B' },
    { offer_id: 'A', name: 'Товар A' },
  ];
  selected: unknown[] = [];
  opened: unknown;
  edited: unknown;
}

@Component({
  imports: [DataTableModule],
  template: `<app-data-table
    id="outer"
    [data]="rows"
    [columns]="columns"
    [lazy]="false"
    selectionMode="none"
  >
    <ng-template #cellTemplate
      ><app-data-table
        id="inner"
        [data]="rows"
        [columns]="innerColumns"
        [lazy]="false"
        selectionMode="none"
    /></ng-template>
  </app-data-table>`,
})
class NestedHost {
  rows = [{ id: 1, name: 'Товар' }];
  columns = [{ field: 'name', header: 'Товар', cellTemplate: true }];
  innerColumns = [{ field: 'name', header: 'Вложенный столбец' }];
}

describe('Employer DataTable integration', () => {
  it('keeps every already-loaded row visible when its page owns pagination or infinite scroll', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.rows = Array.from({ length: 75 }, (_, index) => ({
      offer_id: String(index),
      name: 'Товар ' + index,
    }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(75);
    expect(
      fixture.nativeElement.querySelector('.p-datatable-table-container').style.maxHeight,
    ).toBe('');
  });
  it('uses PrimeNG rows, the employer cell slot, row events and built-in sorting', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('p-table')).not.toBeNull();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    root.querySelector<HTMLButtonElement>('tbody button')!.click();
    expect(fixture.componentInstance.edited).toEqual({ offer_id: 'B', name: 'Товар B' });
    expect(fixture.componentInstance.opened).toBeUndefined();
    root.querySelector<HTMLElement>('tbody td:nth-child(2)')!.click();
    expect(fixture.componentInstance.opened).toEqual({ offer_id: 'B', name: 'Товар B' });
    root.querySelector<HTMLElement>('th:nth-child(2)')!.click();
    await fixture.whenStable();
    expect(root.querySelector('tbody td:nth-child(2)')!.textContent?.trim()).toBe('A');
  });

  it('emits multiple selection and highlights a column only from its header', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLInputElement>('tbody input[type=checkbox]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selected).toEqual([{ offer_id: 'B', name: 'Товар B' }]);
    root
      .querySelector('th:nth-child(2)')!
      .dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(root.querySelectorAll('.o1c-column-hover')).toHaveLength(3);
    root
      .querySelector('tbody button')!
      .dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(root.querySelectorAll('.o1c-column-hover')).toHaveLength(0);
    expect(root.querySelector('tbody tr.o1c-row-hover')).not.toBeNull();
    fixture.destroy();
    expect(root.querySelector('[role=tooltip]')).toBeNull();
  });
  it('lets the nested PrimeNG table own its column hover and tooltip', () => {
    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root
      .querySelector('#inner th')!
      .dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(root.querySelectorAll('[role=tooltip]')).toHaveLength(1);
    expect(
      root
        .querySelector('#outer > .table-state > p-table > div > div > table > tbody > tr')
        ?.classList.contains('o1c-row-hover'),
    ).not.toBe(true);
    expect(root.querySelectorAll('#inner .o1c-column-hover')).toHaveLength(2);
  });
});
