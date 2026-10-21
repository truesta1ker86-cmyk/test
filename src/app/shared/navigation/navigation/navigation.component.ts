import {
  NAVIGATION_COMPONENT_EXACT_OPTIONS,
  NAVIGATION_COMPONENT_QUERY_OPTIONS,
} from './infrastructure/constants/navigation.constants';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { MenuGroup, NavItem, NavChildItem } from './infrastructure/interfaces/nav.models';
import { MENU_CONFIG } from './infrastructure/constants/menu-items';
import { SessionContext } from '../../../core/infrastructure/services/session-context.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
})
export class NavigationComponent implements OnInit {
  @Input() collapsed = false;
  @Output() navigated = new EventEmitter<void>();
  private router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly context = inject(SessionContext);

  readonly exactOptions = NAVIGATION_COMPONENT_EXACT_OPTIONS;
  readonly queryOptions = NAVIGATION_COMPONENT_QUERY_OPTIONS;
  readonly menuGroups: MenuGroup[] = MENU_CONFIG;
  expandedGroups: Set<string> = new Set();

  ngOnInit() {
    this.expandActiveGroup();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(() => this.expandActiveGroup());
  }

  private expandActiveGroup(): void {
    const active = this.menuGroups
      .flatMap((group) => group.items)
      .find((item) => item.children && this.isRouteActive(item.tab));
    this.expandedGroups = new Set(active ? [active.tab] : []);
    this.cdr.markForCheck();
  }

  toggleGroup(tabId: string): void {
    if (this.expandedGroups.has(tabId)) {
      this.expandedGroups.delete(tabId);
    } else {
      this.expandedGroups.add(tabId);
    }

    const group = this.menuGroups.flatMap((item) => item.items).find((item) => item.tab === tabId);
    const first = group?.children?.find((child) => child.default) || group?.children?.[0];
    if (first && !this.isRouteActive(tabId)) {
      void this.router.navigate([first.path || '/' + tabId], { queryParams: first.queryParams });
    }
  }

  isGroupExpanded(tabId: string): boolean {
    return this.expandedGroups.has(tabId);
  }

  isRouteActive(tabId: string): boolean {
    return this.router.url.startsWith(`/${tabId}`);
  }

  isChildActive(item: NavItem, child: NavChildItem): boolean {
    const current = this.router.parseUrl(this.router.url);
    const defaultWorkspace =
      child.default &&
      Object.keys(child.queryParams || {}).every((key) => current.queryParams[key] === undefined);
    const target = this.router.createUrlTree([child.path || '/' + item.tab], {
      queryParams: child.queryParams,
    });
    return this.router.isActive(target, {
      ...this.queryOptions,
      queryParams: defaultWorkspace ? 'ignored' : 'subset',
    });
  }
}
