import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';

@Directive({
  standalone: false,
  selector: '[appMappingModal]',
})
export class MappingModal implements AfterViewInit, OnDestroy {
  private dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef);
  ngAfterViewInit() {
    this.dialog.nativeElement.showModal();
  }
  ngOnDestroy() {
    this.dialog.nativeElement.close();
  }
}
