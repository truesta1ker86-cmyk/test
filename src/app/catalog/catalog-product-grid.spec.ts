import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogProductGrid } from './catalog-product-grid';
import { ProductHoverPreview } from '../shared/product-preview/directives/product-hover-preview.directive';
@Component({
  imports: [CatalogProductGrid, ProductHoverPreview],
  template: `<main appProductHoverPreview>
    <app-catalog-product-grid [rows]="rows" (details)="details = details + 1" />
  </main>`,
})
class Host {
  rows = [
    {
      offer_id: 'A',
      name: 'Полное название товара',
      mapping_status: 'unmapped',
      main_image: 'data:image/png;base64,AA==',
    },
  ];
  details = 0;
}
describe('v1 compact product preview', () => {
  it('opens on hover, pins on click and closes with Escape without opening the data modal', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'td.name-cell > button',
    ) as HTMLButtonElement;
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    fixture.detectChanges();
    expect(document.querySelector('.o1c-product-preview')?.textContent).toContain(
      'Полное название товара',
    );
    button.click();
    fixture.detectChanges();
    expect(document.querySelector('.o1c-product-preview img')).not.toBeNull();
    expect(document.querySelector('.o1c-product-preview-article')?.textContent).toBe('A');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    expect(fixture.componentInstance.details).toBe(0);
    fixture.destroy();
  });
});
