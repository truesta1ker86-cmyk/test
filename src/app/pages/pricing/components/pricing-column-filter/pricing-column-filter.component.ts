import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import type {
  DataTableFilterRule,
  DataTableFilterChange,
} from '../../../../shared/data-table-filter/infrastructure/interfaces/data-table-filter.interfaces';
import type { PricingQuery } from '../../infrastructure/interfaces/pricing-query.interfaces';
import { pricingScopeFilters } from '../../infrastructure/utils/pricing-query.utils';
import type { PriceColumnChange } from './infrastructure/interfaces/pricing-column-filter.interfaces';
import { priceColumns } from './infrastructure/utils/pricing-column-filter.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pricing-column-filter',
  templateUrl: './pricing-column-filter.component.html',
})
export class PricingColumnFilter {
  readonly field = input.required<string>();
  readonly label = input.required<string>();
  readonly numeric = input(false);
  readonly query = input.required<PricingQuery>();
  readonly changed = output<PriceColumnChange>();
  readonly options = signal<string[]>([]);
  readonly counts = signal<Record<string, number>>({});
  readonly busy = signal(false);
  readonly error = signal('');
  readonly rule = computed<DataTableFilterRule | undefined>(() => {
    const rule = priceColumns(this.query().column_filters)[this.field()];
    if (!rule || !Array.isArray(rule.values)) return undefined;
    return {
      ...rule,
      values: rule.values.length ? rule.values : null,
      operator: rule.operator === 'not_contains' ? 'not_contains' : 'contains',
    };
  });
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;

  loadValues(): void {
    this.request?.unsubscribe();
    this.options.set([]);
    this.counts.set({});
    this.error.set('');
    this.busy.set(true);
    this.request = this.api
      .pricingColumnValues(this.field(), pricingScopeFilters(this.query()))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (response) => {
          this.options.set(response.values);
          this.counts.set(response.counts || {});
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  cancelValues(): void {
    this.request?.unsubscribe();
    this.busy.set(false);
  }
  change(change: DataTableFilterChange): void {
    const rule = change.rule;
    this.changed.emit({
      field: change.field,
      value: rule ? { ...rule, values: rule.values || [] } : null,
    });
  }
}
