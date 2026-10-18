import {
  STOCK_PRODUCT_FILTERS_FILTER_OPTIONS_1,
  STOCK_PRODUCT_FILTERS_FILTER_OPTIONS_3,
} from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { stockFacetFields } from '../../../infrastructure/constants/filter-state.constants';
import type { StockChoice } from '../../../infrastructure/types/stock-choice.types';
import type { StockTextFilterChange } from './infrastructure/types/stock-product-filters.types';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-inventory-filter',

  templateUrl: './inventory-filter.component.html',
  styleUrl: './inventory-filter.component.css',
})
export class InventoryFilterComponent {
  readonly choices = input.required<Record<string, StockChoice[]>>();
  readonly values = input.required<Record<string, string[]>>();
  readonly reconciliation = input(false);
  readonly article = input('');
  readonly name = input('');
  readonly articleOperator = input('contains');
  readonly nameOperator = input('contains');
  readonly busy = input(false);
  readonly selected = input(0);
  readonly filterChanged = output<{ key: string; values: string[] }>();
  readonly textChanged = output<StockTextFilterChange>();
  readonly filtersReset = output<void>();
  readonly filtersApplied = output<void>();
  readonly selectFound = output<void>();
  readonly clearSelection = output<void>();
  readonly opened = signal(false);
  readonly activeCount = computed(
    () =>
      Object.values(this.values()).filter((v) => v.length).length +
      Number(!!this.article().trim()) +
      Number(!!this.name().trim()),
  );
  readonly fields = computed(() => [
    ...stockFacetFields,
    ['mapping_status', 'Связь с 1С'],
    ['rules_status', 'Наличие правил'],
    ['distribution_status', 'Распределение'],
    ...(this.reconciliation()
      ? [
          ['status', 'Расхождение FBS'],
          ['source', 'Источник остатка'],
        ]
      : []),
  ]);
  close() {
    this.opened.set(false);
  }
  done() {
    this.filtersApplied.emit();
    this.close();
  }
  selectProducts() {
    if (!this.busy()) {
      this.selectFound.emit();
      this.close();
    }
  }
  clearProducts() {
    this.clearSelection.emit();
    this.close();
  }

  nameOperatorOptions() {
    return STOCK_PRODUCT_FILTERS_FILTER_OPTIONS_1;
  }
  articleOperatorOptions() {
    return STOCK_PRODUCT_FILTERS_FILTER_OPTIONS_3;
  }
}
