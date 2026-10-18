import { ProductNameModule } from '../directives/product-name.module';
import { ProductHoverPreviewModule } from '../directives/product-hover-preview.module';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProductPreviewData } from './interfaces/product-name.interfaces';

@Component({
  imports: [ProductNameModule, ProductHoverPreviewModule],
  template: `<main appProductHoverPreview>
    <table>
      <tbody>
        <tr>
          <td>
            <span id="first" [appProductName]="first()">Первый</span
            ><span id="second" [appProductName]="second">Второй</span>
          </td>
        </tr>
        <tr>
          <td><span id="total" [appProductName]="null">Итого по категории</span></td>
        </tr>
      </tbody>
    </table>
    <a
      id="link"
      href="#product"
      [appProductName]="first()"
      (click)="$event.preventDefault(); clicks = clicks + 1"
      >Товар</a
    ><span id="review" [appProductName]="{ offer_id: 'A', name: 'Название из проверки' }"
      >Проверка</span
    >
  </main>`,
})
class Host {
  readonly first = input<ProductPreviewData>({
    offer_id: 'A',
    product_name: 'Первый товар',
    main_image: 'data:image/png;base64,AA==',
  });
  second: ProductPreviewData = { offer_id: 'B', name: 'Второй товар' };
  clicks = 0;
}

describe('product names across screens', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }
  it('does not turn categories or totals into products and preserves interactive elements', () => {
    const { fixture, root } = setup();
    expect(root.querySelector('#total')?.hasAttribute('data-product-preview')).toBe(false);
    expect(root.querySelector('#first')?.getAttribute('tabindex')).toBe('0');
    expect(root.querySelector('#link')?.hasAttribute('tabindex')).toBe(false);
    (root.querySelector('#link') as HTMLAnchorElement).click();
    expect(fixture.componentInstance.clicks).toBe(1);
    fixture.destroy();
  });
  it('anchors each product in a multi-product order row beneath its own name', () => {
    const { fixture, root } = setup();
    const first = root.querySelector('#first')!,
      second = root.querySelector('#second')!;
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      bottom: 70,
      width: 100,
      height: 20,
      right: 200,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({
      left: 300,
      top: 90,
      bottom: 110,
      width: 100,
      height: 20,
      right: 400,
      x: 300,
      y: 90,
      toJSON: () => ({}),
    });
    second.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    const card = document.querySelector<HTMLElement>('.o1c-product-preview')!;
    expect(card.style.left).toBe('292px');
    expect(card.style.top).toBe('116px');
    expect(card.querySelector('.o1c-product-preview-article')?.textContent).toBe('B');
    fixture.destroy();
  });
  it('uses an already-rendered local photo in a review without lookup requests', () => {
    const { fixture, root } = setup();
    root.querySelector('#review')!.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(document.querySelector('.o1c-product-preview img')?.getAttribute('src')).toBe(
      'data:image/png;base64,AA==',
    );
    expect(document.querySelector('.o1c-product-preview-name')?.textContent).toBe(
      'Название из проверки',
    );
    fixture.destroy();
  });
  it('supports Enter on a static product name without changing its data', () => {
    const { fixture, root } = setup();
    const first = root.querySelector('#first')!;
    first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(document.querySelector('.o1c-product-preview')).not.toBeNull();
    first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    expect(fixture.componentInstance.first().offer_id).toBe('A');
    fixture.destroy();
  });
  it('previews a 1C name identified by its article even without an Ozon offer', () => {
    const { fixture, root } = setup();
    fixture.componentRef.setInput('first', { sku_1c: 'ONEC-123', product_name: 'Номенклатура 1С' });
    fixture.detectChanges();
    expect(root.querySelector('#first')?.getAttribute('data-product-preview')).toBe('ONEC-123');
    root.querySelector('#first')!.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(document.querySelector('.o1c-product-preview-article')?.textContent).toBe('ONEC-123');
    expect(document.querySelector('.o1c-product-preview-name')?.textContent).toBe(
      'Номенклатура 1С',
    );
    fixture.destroy();
  });
});
