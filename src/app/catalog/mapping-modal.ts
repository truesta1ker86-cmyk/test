import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
/** Native modality keeps background rows inert while a mapping is reviewed. */
@Directive({ selector: '[appMappingModal]' })
export class MappingModal implements AfterViewInit, OnDestroy {
  private dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef);
  ngAfterViewInit() {
    this.dialog.nativeElement.showModal();
  }
  ngOnDestroy() {
    this.dialog.nativeElement.close();
  }
}
