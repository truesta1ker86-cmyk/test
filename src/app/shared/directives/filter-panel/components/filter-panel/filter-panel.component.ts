// components/filter-panel/filter-panel.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  computed,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { FilterConfig, GROUP_ICONS, GROUP_LABELS, ValidFilterValues } from '../../infrastructure/models/filter.model';
import { FilterService } from '../../infrastructure/services/filter.service';

export interface FilterGroup {
  key: string;
  name: string;
  filters: FilterConfig[];
}

@Component({
  selector: 'app-filter-panel',
  standalone: false,
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss'],
})
export class FilterPanelComponent implements OnInit, OnDestroy {
  @Input() configs: FilterConfig[] = [];
  @Input() layout: 'grid' | 'inline' | 'vertical' = 'grid';
  @Input() columns: number = 3;
  @Input() showHeader: boolean = true;
  @Input() showReset: boolean = true;
  @Input() showApply: boolean = false;
  @Input() title: string = 'Фильтры';

  @Output() filtersChanged = new EventEmitter<ValidFilterValues>();
  @Output() applyClicked = new EventEmitter<void>();
  @Output() resetClicked = new EventEmitter<void>();

  private filterService = inject(FilterService);
  private subscriptions: Subscription[] = [];

  public activeCount = this.filterService.activeFiltersCount;
  public hasChanges = this.filterService.hasChanges;
  public isResetting = this.filterService.isResetting;

  public filterGroups = computed<FilterGroup[]>(() => {
    const grouped = this.filterService.groupedConfigs();
    const result: FilterGroup[] = [];

    for (const key in grouped) {
      if (Object.prototype.hasOwnProperty.call(grouped, key)) {
        const filters = grouped[key];
        if (filters && filters.length > 0) {
          result.push({
            key: key,
            name: this.getGroupLabel(key),
            filters: filters,
          });
        }
      }
    }

    return result;
  });

  public groupsWithoutDefault = computed(() => {
    return this.filterGroups().filter((group) => group.key !== '__default__');
  });

  public defaultGroup = computed(() => {
    const defaultGroup = this.filterGroups().find((group) => group.key === '__default__');
    return defaultGroup ? defaultGroup.filters : [];
  });

  public get gridTemplate(): string {
    return `repeat(${this.columns}, 1fr)`;
  }

  getGroupLabel(groupKey: string): string {
    if (groupKey === '__default__') return '';
    return GROUP_LABELS[groupKey] || groupKey;
  }

  getGroupIcon(groupKey: string): string {
    return GROUP_ICONS[groupKey] || 'pi pi-tag';
  }

  ngOnInit() {
    this.filterService.setConfigs(this.configs);

    this.subscriptions.push(
      this.filterService.changes$.subscribe((validFilters) => {
        this.filtersChanged.emit(validFilters);
      }),
    );
  }

  resetAllFilters(): void {
    this.filterService.resetAll();
    this.resetClicked.emit();
  }

  applyFilters(): void {
    this.applyClicked.emit();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
