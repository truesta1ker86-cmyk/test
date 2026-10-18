import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { NavigationComponent } from './navigation.component';
import { NavigationModule } from '../navigation.module';

@Component({ template: '' })
class EmptyPage {}

describe('Employer navigation with Ozon and 1C routes', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [NavigationModule],
      providers: [provideRouter([{ path: '**', component: EmptyPage }])],
    });
    const fixture = TestBed.createComponent(NavigationComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement, router: TestBed.inject(Router) };
  }
  it('keeps all destinations and the stock query tabs in the original menu groups', () => {
    const { fixture, router } = setup();
    const destinations = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((node) => router.serializeUrl(node.injector.get(RouterLink).urlTree!));
    expect(destinations).toContain('/stocks?tab=reconciliation');
    expect(destinations).toContain('/stocks?tab=matrix');
    for (const path of [
      '/products',
      '/orders',
      '/returns',
      '/pricing',
      '/pricing/formula',
      '/finance',
      '/mapping',
      '/promotions',
      '/account',
      '/imports',
    ])
      expect(destinations).toContain(path);
  });
  it('uses the employer group state and emits the mobile close action for a destination', () => {
    const { fixture, root } = setup();
    const component = fixture.componentInstance;
    expect(component.isGroupExpanded('stocks')).toBe(false);
    component.toggleGroup('stocks');
    expect(component.isGroupExpanded('stocks')).toBe(true);
    const navigated = vi.fn();
    component.navigated.subscribe(navigated);
    root.querySelector<HTMLButtonElement>('.nav-stock-child')!.click();
    expect(navigated).toHaveBeenCalledOnce();
  });
  it('keeps the pricing menu active for query filters and uses the formula destination separately', async () => {
    const { fixture, root, router } = setup();
    await router.navigateByUrl('/pricing?search=A-001');
    fixture.detectChanges();
    expect(root.querySelector('[data-tab=pricing]')!.classList.contains('active')).toBe(true);
    await router.navigateByUrl('/pricing/formula');
    fixture.detectChanges();
    expect(root.querySelector('[data-tab=pricing]')!.classList.contains('active')).toBe(false);
    expect(root.querySelector('[data-tab=formula]')!.classList.contains('active')).toBe(true);
  });
});
