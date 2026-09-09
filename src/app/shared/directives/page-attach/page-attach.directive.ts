import { Directive, inject, ComponentRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Directive({
  selector: '[appPageAttach]',
  standalone: false
})
export class PageAttachDirective {
  public outlet = inject(RouterOutlet);

  getComponentInstance(): any | null {
    return this.outlet && this.outlet.isActivated ? this.outlet.component : null;
  }

  getRouteData(): any {
    return this.outlet && this.outlet.isActivated ? this.outlet.activatedRouteData : {};
  }
}