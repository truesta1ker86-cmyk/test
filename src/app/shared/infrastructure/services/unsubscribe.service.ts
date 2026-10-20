import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/** Cancels subscriptions with the component that provides this service. */
@Injectable()
export class UnsubscribeService implements OnDestroy {
  public readonly destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
