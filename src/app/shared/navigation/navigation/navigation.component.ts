import { NAVIGATION_COMPONENT_EXACT_OPTIONS } from './infrastructure/constants/navigation.constants';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { Router } from '@angular/router';
import type { MenuGroup } from './infrastructure/interfaces/nav.models';
import { MENU_CONFIG } from './infrastructure/constants/menu-items';

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

  readonly exactOptions = NAVIGATION_COMPONENT_EXACT_OPTIONS;
  readonly menuGroups: MenuGroup[] = MENU_CONFIG;
  expandedGroups: Set<string> = new Set();

  ngOnInit() {
    if (this.router.url.startsWith('/stocks')) {
      this.expandedGroups.add('stocks');
    }
  }

  toggleGroup(tabId: string): void {
    if (this.expandedGroups.has(tabId)) {
      this.expandedGroups.delete(tabId);
    } else {
      this.expandedGroups.add(tabId);
    }

    if (tabId === 'stocks' && !this.router.url.startsWith('/stocks')) {
      this.router.navigate(['/stocks'], { queryParams: { tab: 'reconciliation' } });
    }
  }

  isGroupExpanded(tabId: string): boolean {
    return this.expandedGroups.has(tabId);
  }

  isRouteActive(tabId: string): boolean {
    return this.router.url.startsWith(`/${tabId}`);
  }
}
