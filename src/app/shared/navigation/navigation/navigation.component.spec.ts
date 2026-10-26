import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { NavigationComponent } from './navigation.component';
import { NavigationModule } from '../navigation.module';
import { SessionContext } from '../../../core/infrastructure/services/session-context.service';

@Component({ template: '' })
class EmptyPage {}

describe('Employer navigation with Ozon and 1C routes', () => {
  function setup(owner = true) {
    TestBed.configureTestingModule({
      imports: [NavigationModule],
      providers: [provideRouter([{ path: '**', component: EmptyPage }])],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Fixture',
      actor_name: 'Tester',
      role: owner ? 'owner' : 'viewer',
      is_owner: owner,
      expires_in_seconds: 3600,
    });
    const fixture = TestBed.createComponent(NavigationComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement, router: TestBed.inject(Router) };
  }
  it('matches V1 groups and destinations, including cards and separate account tabs', () => {
    const { fixture, root, router } = setup();
    expect([...root.querySelectorAll('.nav-label')].map((n) => n.textContent?.trim())).toEqual([
      'Разделы',
      'Аналитика',
      'Расчёты',
      'Excel и 1С',
      'Аккаунт',
    ]);
    expect([...root.querySelectorAll('.nav-item-label')].map((n) => n.textContent?.trim())).toEqual(
      [
        'Обзор',
        'Заказы',
        'Остатки',
        'Возвраты',
        'Финансовый результат',
        'Карточки товаров',
        'Расчёт цен',
        'Загрузка Excel',
        'Связь товаров с 1С',
        'Баланс и пополнение',
        'Команда',
      ],
    );
    const destinations = fixture.debugElement.queryAll(By.directive(RouterLink)).flatMap((node) => {
      const target = node.injector.get(RouterLink).urlTree;
      return target ? [router.serializeUrl(target)] : [];
    });
    expect(destinations).toContain('/stocks?tab=reconciliation');
    expect(destinations).toContain('/stocks?tab=matrix');
    for (const path of [
      '/orders',
      '/returns',
      '/products',
      '/pricing?workspace=calculation',
      '/pricing?workspace=automation',
      '/pricing/formula',
      '/finance',
      '/mapping',
      '/account?tab=billing',
      '/account?tab=team',
      '/imports',
    ])
      expect(destinations).toContain(path);
    expect(destinations).not.toContain('/migration');
    expect(destinations).not.toContain('/promotions');
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
  it('expands pricing on navigation and highlights the exact workspace', async () => {
    const { fixture, root, router } = setup();
    await router.navigateByUrl('/pricing?search=A-001');
    fixture.detectChanges();
    expect(root.querySelector('[data-tab=pricing]')!.classList.contains('active')).toBe(true);
    expect(fixture.componentInstance.isGroupExpanded('pricing')).toBe(true);
    expect(root.querySelector('[data-workspace=calculation]')!.classList.contains('active')).toBe(
      true,
    );
    await router.navigateByUrl('/pricing/formula');
    fixture.detectChanges();
    expect(root.querySelector('[data-tab=pricing]')!.classList.contains('active')).toBe(true);
    expect(root.querySelector('[data-workspace=formula]')!.classList.contains('active')).toBe(true);
    expect(root.querySelector('[data-workspace=calculation]')!.classList.contains('active')).toBe(
      false,
    );
    await router.navigateByUrl('/pricing?workspace=automation&search=A-001');
    fixture.detectChanges();
    expect(root.querySelector('[data-workspace=automation]')!.classList.contains('active')).toBe(
      true,
    );
    expect(root.querySelector('[data-workspace=calculation]')!.classList.contains('active')).toBe(
      false,
    );
  });
  it('keeps balance and team active separately and hides team from a viewer', async () => {
    const { fixture, root, router } = setup(false);
    expect(root.querySelector('[data-tab=team]')).toBeNull();
    await router.navigateByUrl('/account?tab=billing');
    fixture.detectChanges();
    expect(root.querySelector('[data-tab=billing]')!.classList.contains('active')).toBe(true);
    await router.navigateByUrl('/account?tab=profile');
    fixture.detectChanges();
    expect(root.querySelector('[data-tab=billing]')!.classList.contains('active')).toBe(false);
  });
  it('keeps the stock child active when additional table filters are present', async () => {
    const { fixture, root, router } = setup();
    await router.navigateByUrl('/stocks?tab=matrix&q=test');
    fixture.detectChanges();
    expect(root.querySelector('[data-workspace=allocation]')!.classList.contains('active')).toBe(
      true,
    );
    expect(root.querySelector('[data-workspace=inventory]')!.classList.contains('active')).toBe(
      false,
    );
  });
  it('keeps named icon destinations working when the sidebar is collapsed', async () => {
    const { fixture, root, router } = setup();
    fixture.componentRef.setInput('collapsed', true);
    await fixture.whenStable();
    for (const item of root.querySelectorAll<HTMLElement>('.nav-item')) {
      expect(item.getAttribute('aria-label')).toBeTruthy();
      expect(item.getAttribute('title')).toBeTruthy();
    }
    const stocks = root.querySelector<HTMLButtonElement>('[data-tab=stocks]')!;
    expect(stocks.hasAttribute('aria-expanded')).toBe(false);
    expect(root.querySelector<HTMLElement>('#stocks-nav-children')!.hidden).toBe(true);
    stocks.click();
    await fixture.whenStable();
    expect(router.url).toBe('/stocks?tab=reconciliation');
    root.querySelector<HTMLButtonElement>('[data-tab=pricing]')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/pricing?workspace=calculation');
  });
});
