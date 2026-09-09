import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  untracked,
} from '@angular/core';
import { FilterConfig } from './infrastructure/models/filter.model';
import { FilterService } from './infrastructure/services/filter.service';


interface FilterGroupContext {
  $implicit: {
    groupName: string;
    filters: FilterConfig[];
    values: Record<string, any>;
    getValue: (key: string) => any;
    updateFilter: (key: string, value: any) => void;
  };
}

@Directive({
  selector: '[appFilterGroup]',
  standalone: false
})
export class FilterGroupDirective {
  @Input('appFilterGroupName') groupName: string = '';

  private filterService = inject(FilterService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const grouped = this.filterService.groupedConfigs();
      const values = this.filterService.values();

      untracked(() => {
        // Если группа указана - рендерим только её
        if (this.groupName) {
          const filters = grouped[this.groupName] || [];
          this.renderGroup(this.groupName, filters);
        } else {
          // Иначе рендерим все группы
          for (const [groupName, filters] of Object.entries(grouped)) {
            if (groupName !== '__default__') {
              this.renderGroup(groupName, filters);
            }
          }
        }
      });
    });
  }

  private renderGroup(groupName: string, filters: FilterConfig[]): void {
    if (filters.length === 0) return;

    const context: FilterGroupContext = {
      $implicit: {
        groupName: groupName === '__default__' ? '' : groupName,
        filters: filters,
        values: this.filterService.values(),
        getValue: this.filterService.getValue.bind(this.filterService),
        updateFilter: this.filterService.updateFilter.bind(this.filterService),
      },
    };

    this.viewContainer.clear();
    this.viewContainer.createEmbeddedView(this.templateRef, context);
  }
}
