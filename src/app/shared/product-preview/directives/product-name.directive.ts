import { Directive, ElementRef, inject, input } from '@angular/core';
import type { ProductPreviewData } from '../infrastructure/interfaces/product-name.interfaces';
import { string } from '../infrastructure/utils/product-name.utils';

@Directive({
  standalone: false,

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
