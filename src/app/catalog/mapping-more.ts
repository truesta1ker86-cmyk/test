import { Directive, ElementRef, effect, inject, input, output } from '@angular/core';
@Directive({ selector: '[appMappingMore]' })
export class MappingMore {
  readonly enabled = input(false);
  readonly visible = output<void>();
  private element = inject(ElementRef<HTMLElement>);
  constructor() {
    effect((cleanup) => {
      if (!this.enabled() || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this.visible.emit();
        },
        { rootMargin: '120px' },
      );
      observer.observe(this.element.nativeElement);
      cleanup(() => observer.disconnect());
    });
  }
}
