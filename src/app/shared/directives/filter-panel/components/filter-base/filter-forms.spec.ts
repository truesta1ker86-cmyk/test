import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../filter-panel.module';
import { FilterService } from '../../infrastructure/services/filter.service';
import { FilterSelectComponent } from '../filter-select/filter-select.component';
import { FilterDateComponent } from '../filter-date/filter-date.component';
import { FilterValuesModule } from '../../../../filtering/filter-values.module';
import { FilterMultiselectComponent } from '../filter-multiselect/filter-multiselect.component';

@Component({
  standalone: true,
  imports: [FilterPanelModule, ReactiveFormsModule, FormsModule, FilterValuesModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FilterService],
  template: `<app-filter-select
      key="scheme"
      label="Схема"
      [options]="options"
      [formControl]="scheme"
    />
    <app-filter-text key="search" [formControl]="search" />
    <app-filter-date key="start" [formControl]="start" />
    <app-filter-multiselect
      key="facet"
      [options]="options"
      [ngModel]="facet | filterValues"
      (ngModelChange)="setFacet($event)"
    />
    <button id="reset-facets" type="button" (click)="facet = '[]'">Сбросить</button>`,
})
class FilterFormsHost {
  scheme = new FormControl('fbs', { nonNullable: true });
  search = new FormControl('артикул', { nonNullable: true });
  start = new FormControl('2026-10-01', { nonNullable: true });
  options = [
    { value: 'fbs', label: 'FBS' },
    { value: 'fbo', label: 'FBO' },
  ];
  facet = '["fbs"]';
  setFacet(values: string[]) {
    this.facet = JSON.stringify(values);
  }
}

describe('Original filter controls with business forms', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [FilterFormsHost] }));
  it('uses the scoped original service and preserves other fields when options load', async () => {
    const fixture = TestBed.createComponent(FilterFormsHost);
    await fixture.whenStable();
    const service = fixture.debugElement.injector.get(FilterService);
    const control = fixture.debugElement.query(By.directive(FilterSelectComponent))
      .componentInstance as FilterSelectComponent;
    expect(service.getValue('scheme')).toBe('fbs');
    expect(service.getValue('search')).toBe('артикул');
    (control as any).updateValue('fbo');
    expect(fixture.componentInstance.scheme.value).toBe('fbo');
    fixture.componentInstance.options = [
      ...fixture.componentInstance.options,
      { value: 'rfbs', label: 'rFBS' },
    ];
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(service.getValue('scheme')).toBe('fbo');
    expect(service.getValue('search')).toBe('артикул');
    fixture.componentInstance.scheme.reset('fbs');
    await fixture.whenStable();
    expect(service.getValue('scheme')).toBe('fbs');
    const second = TestBed.createComponent(FilterFormsHost);
    await second.whenStable();
    expect(second.debugElement.injector.get(FilterService)).not.toBe(service);
  });
  it('does not apply a filter on programmatic writes and restores disabled controls', async () => {
    const fixture = TestBed.createComponent(FilterFormsHost);
    await fixture.whenStable();
    const control = fixture.debugElement.query(By.directive(FilterSelectComponent))
      .componentInstance as FilterSelectComponent;
    const changed = vi.fn();
    control.userChange.subscribe(changed);
    fixture.componentInstance.scheme.setValue('fbo');
    fixture.componentInstance.scheme.disable();
    await fixture.whenStable();
    expect(control.disabled).toBe(true);
    (control as any).updateValue('fbs');
    expect(fixture.componentInstance.scheme.value).toBe('fbo');
    fixture.componentInstance.scheme.enable();
    await fixture.whenStable();
    expect(control.disabled).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    (control as any).updateValue(null);
    expect(fixture.componentInstance.scheme.value).toBe('');
  });
  it('preserves ISO calendar dates used by reporting APIs', async () => {
    const fixture = TestBed.createComponent(FilterFormsHost);
    await fixture.whenStable();
    const control = fixture.debugElement.query(By.directive(FilterDateComponent))
      .componentInstance as FilterDateComponent;
    expect(control.value).toEqual(new Date(2026, 9, 1));
    (control as any).updateValue(new Date(2026, 9, 17));
    expect(fixture.componentInstance.start.value).toBe('2026-10-17');
  });
  it('settles with serialized API facets and propagates user selection and reset', async () => {
    const fixture = TestBed.createComponent(FilterFormsHost);
    await fixture.whenStable();
    const control = fixture.debugElement.query(By.directive(FilterMultiselectComponent))
      .componentInstance as FilterMultiselectComponent;
    (control as any).updateValue(['fbo']);
    await fixture.whenStable();
    expect(fixture.componentInstance.facet).toBe('["fbo"]');
    fixture.nativeElement.querySelector('#reset-facets').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(control.value).toEqual([]);
  });
  it('propagates the original service reset back to business forms', async () => {
    const fixture = TestBed.createComponent(FilterFormsHost);
    await fixture.whenStable();
    const service = fixture.debugElement.injector.get(FilterService);
    service.resetAll();
    await fixture.whenStable();
    expect(fixture.componentInstance.scheme.value).toBe('');
    expect(fixture.componentInstance.search.value).toBe('');
    expect(fixture.componentInstance.facet).toBe('[]');
    expect(service.activeFiltersCount()).toBe(0);
  });
});
