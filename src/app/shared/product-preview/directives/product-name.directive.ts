import { Directive, ElementRef, inject, input } from '@angular/core';

export interface ProductPreviewData {
  offer_id?: unknown;
  sku_1c?: unknown;
  sku?: unknown;
  name?: unknown;
  product_name?: unknown;
  main_image?: unknown;
}
const string = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';
/** Marks a real product name, without changing its click or navigation behavior. */
@Directive({
  selector: '[appProductName]',
  host: {
    '[attr.data-product-preview]': 'article() || null',
    '[attr.data-product-preview-name]': 'name() || null',
    '[attr.data-product-preview-image]': 'image() || null',
    '[attr.data-product-preview-anchor]': 'article() ? "" : null',
    '[attr.tabindex]': 'article() && !interactive ? 0 : null',
  },
})
export class ProductName {
  readonly data = input<ProductPreviewData | null | undefined>(null, { alias: 'appProductName' });
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly interactive = !!this.element.nativeElement.closest('a,button,input,select,textarea');
  article() {
    return string(this.data()?.offer_id || this.data()?.sku_1c || this.data()?.sku).trim();
  }
  name() {
    return string(this.data()?.name || this.data()?.product_name) || this.article();
  }
  image() {
    return typeof this.data()?.main_image === 'string' ? (this.data()!.main_image as string) : '';
  }
}
