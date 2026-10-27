import {
  ChangeDetectionStrategy,
  isSignal,
  AfterContentInit,
  Component,
  ContentChildren,
  inject,
  OnDestroy,
  QueryList,
  ChangeDetectorRef,
} from '@angular/core';
import { SessionContext } from '../../../core/infrastructure/services/session-context.service';
import { Router } from '@angular/router';
import { PageAttachDirective } from '../../directives/page-attach/page-attach.directive';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { pageTitle } from './infrastructure/utils/page.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-page',
  standalone: false,
  styleUrls: ['./page.component.scss', './workspace-shell.css'],
  templateUrl: './page.component.html',
})
export class PageComponent implements AfterContentInit, OnDestroy {
  readonly context = inject(SessionContext);
  mobileMenu = false;
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private outletActivationSub?: Subscription;

  @ContentChildren(PageAttachDirective)
  attachedOutlet!: QueryList<PageAttachDirective>;

  get currentTitle(): string {
    const title = this.activePageInstance?.pageTitle;
    return (isSignal(title) ? title() : title) ?? pageTitle(this.router.url);
  }
  get currentSubtitle(): string {
    const subtitle = this.activePageInstance?.pageSubtitle;
    return (isSignal(subtitle) ? subtitle() : subtitle) ?? '';
  }
  activePageInstance: any = null;

  isSidebarCollapsed = false;

  ngAfterContentInit(): void {
    this.attachedOutlet.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe((list: QueryList<PageAttachDirective>) => {
        this.listenToOutletEvents(list.first);
      });

    if (this.attachedOutlet.first) {
      this.listenToOutletEvents(this.attachedOutlet.first);
    }
  }

  private listenToOutletEvents(pageAttach: PageAttachDirective | undefined): void {
    this.outletActivationSub?.unsubscribe();

    if (!pageAttach || !pageAttach.outlet) return;

    this.activePageInstance = pageAttach.getComponentInstance();
    if (this.activePageInstance)
      queueMicrotask(() => {
        if (!this.destroy$.closed) this.updatePageData();
      });

    this.outletActivationSub = pageAttach.outlet.activateEvents.subscribe(
      (activatedComponentInstance: any) => {
        this.activePageInstance = activatedComponentInstance;

        setTimeout(() => {
          this.updatePageData();
        });
      },
    );
  }

  public updatePageData() {
    this.cdr.markForCheck();
  }

  closeMenu() {
    this.mobileMenu = false;
  }

  toggleSidebarCollapsed() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  navigateToBilling() {
    this.router.navigate(['/billing']);
  }

  ngOnDestroy() {
    this.outletActivationSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
