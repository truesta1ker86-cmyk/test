import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  output,
} from '@angular/core';

/** Keyboard and return focus for the lightweight editor dialogs. */
@Directive({ selector: '[appModalFocus]', host: { tabindex: '-1' } })
export class ModalFocus implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private previous: HTMLElement | null = null;
  readonly modalEscape = output<void>();
  ngAfterViewInit() {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    queueMicrotask(() => this.focusable()[0]?.focus());
  }
  private focusable() {
    return [
      ...this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]',
      ),
    ].filter((e) => e.getClientRects().length > 0);
  }
  @HostListener('keydown', ['$event']) key(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.modalEscape.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = this.focusable();
    if (!elements.length) {
      event.preventDefault();
      this.element.nativeElement.focus();
      return;
    }
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  ngOnDestroy() {
    if (this.previous?.isConnected) this.previous.focus();
  }
}
