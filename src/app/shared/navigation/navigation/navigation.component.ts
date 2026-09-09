import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuGroup } from './infrastructure/interfaces/nav.models';
import { MENU_CONFIG } from './infrastructure/constants/menu-items';


@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {

  private router = inject(Router);

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
      this.router.navigate(['/stocks/inventory']);
    }
  }

  isGroupExpanded(tabId: string): boolean {
    return this.expandedGroups.has(tabId);
  }

  isRouteActive(tabId: string): boolean {
    return this.router.url.startsWith(`/${tabId}`);
  }
}
