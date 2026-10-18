import { CatalogProductGridModule } from './catalog-product-grid.module';
import { ProductHoverPreviewModule } from '../../../../shared/product-preview/directives/product-hover-preview.module';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

@Component({
  imports: [CatalogProductGridModule, ProductHoverPreviewModule],
  template: `<main appProductHoverPreview>
    <app-catalog-product-grid
      [rows]="rows"
      [selected]="selection()"
      (details)="details = details + 1"
    />
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
  selection = signal(new Set<string>());
}

describe('v1 compact product preview', () => {
  it('opens on hover, pins on click and closes with Escape without opening the data modal', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'td.name-cell button[data-product-preview-anchor]',
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
  it('reflects the business selection in the employer table rows', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.selection.set(new Set(['A']));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('p-table tbody tr.selected')).toHaveLength(1);
    fixture.componentInstance.selection.set(new Set());
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('p-table tbody tr.selected')).toHaveLength(0);
  });
});
