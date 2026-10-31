import { AfterViewInit, DestroyRef, Directive, ElementRef, Input, inject } from '@angular/core';
import { bindMatrixPageScroll } from '../../../../infrastructure/utils/matrix-page-scroll.utils';

@Directive({ selector: '[appMatrixPageScroll]', standalone: false })
export class MatrixPageScrollDirective implements AfterViewInit {
  @Input({ required: true }) appMatrixPageScroll!: HTMLElement;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.destroy.onDestroy(bindMatrixPageScroll(this.host, this.appMatrixPageScroll));
  }
}
