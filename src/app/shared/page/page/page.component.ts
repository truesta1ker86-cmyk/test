import { AfterContentInit, Component, ContentChildren, inject, OnDestroy, QueryList, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PageAttachDirective } from '../../directives/page-attach/page-attach.directive';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-page',
  standalone: false,
  styleUrls: ['./page.component.scss'],
  templateUrl: './page.component.html',
})
export class PageComponent implements AfterContentInit, OnDestroy {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private outletActivationSub?: Subscription;

  @ContentChildren(PageAttachDirective) 
  attachedOutlet!: QueryList<PageAttachDirective>;

  currentTitle = '';
  currentSubtitle = '';
  activePageInstance: any = null;

  isSidebarCollapsed = false;

  ngAfterContentInit(): void {
    this.attachedOutlet.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe((list: QueryList<PageAttachDirective>) => {
      this.listenToOutletEvents(list.first);
    });

    if (this.attachedOutlet.first) {
      this.listenToOutletEvents(this.attachedOutlet.first);
    }
  }

  private listenToOutletEvents(pageAttach: PageAttachDirective | undefined): void {
    this.outletActivationSub?.unsubscribe();

    if (!pageAttach || !pageAttach.outlet) return;

    this.outletActivationSub = pageAttach.outlet.activateEvents.subscribe((activatedComponentInstance: any) => {
      this.activePageInstance = activatedComponentInstance;

      setTimeout(() => {
        this.updatePageData();
      });
    });
  }

  public updatePageData() {
    if (this.activePageInstance) {
      this.currentTitle = this.activePageInstance.pageTitle ?? '';
      this.currentSubtitle = this.activePageInstance.pageSubtitle ?? '';
    } else {
      this.currentTitle = '';
      this.currentSubtitle = '';
    }
    this.cdr.detectChanges();
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
