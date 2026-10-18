import { TestBed } from '@angular/core/testing';
import { IconsSpriteModule } from '../icons-sprite.module';
import { IconsSpriteComponent } from './icons-sprite.component';

describe('Employer icons sprite', () => {
  it('creates the original component through its NgModule', async () => {
    TestBed.configureTestingModule({ imports: [IconsSpriteModule] });
    const fixture = TestBed.createComponent(IconsSpriteComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeInstanceOf(IconsSpriteComponent);
    expect(fixture.nativeElement.querySelector('svg defs')).not.toBeNull();
  });

  it('provides every original SVG symbol used by the application shell', async () => {
    TestBed.configureTestingModule({ imports: [IconsSpriteModule] });
    const fixture = TestBed.createComponent(IconsSpriteComponent);
    await fixture.whenStable();

    const symbols = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<SVGSymbolElement>('svg defs symbol'),
    );
    expect(symbols.map((symbol) => symbol.id).sort()).toEqual(
      [
        'i-box',
        'i-warehouse',
        'i-tag',
        'i-return',
        'i-wallet',
        'i-upload',
        'i-download',
        'i-printer',
        'i-refresh',
        'i-check',
        'i-x',
        'i-alert',
        'i-shield',
        'i-grid',
        'i-clock',
        'i-menu',
        'i-panel-toggle',
        'i-logout',
        'i-users',
        'i-chart',
        'i-trending',
        'i-plus',
        'i-edit',
        'i-save',
        'i-filter',
        'i-search',
      ].sort(),
    );
    for (const symbol of symbols) {
      expect(symbol.getAttribute('viewBox')).toBeTruthy();
      expect(
        symbol.querySelector('path, circle, rect, polygon, polyline, line, ellipse'),
      ).not.toBeNull();
    }
  });
});
