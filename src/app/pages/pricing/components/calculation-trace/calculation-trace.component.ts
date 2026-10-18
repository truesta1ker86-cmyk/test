import {
  PRICING_CALCULATION_TRACE_TABLE_COLUMNS1,
  PRICING_CALCULATION_TRACE_TABLE_COLUMNS2,
  PRICING_CALCULATION_TRACE_TABLE_COLUMNS3,
  PRICING_CALCULATION_TRACE_ACTUAL_FIELDS,
  PRICING_CALCULATION_TRACE_VARIABLE_LABELS,
} from './infrastructure/constants/calculation-trace.constants';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type { Amount } from '../../../../core/infrastructure/types/contracts.types';
import type { Calculation } from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { money, source } from '../../../../core/infrastructure/utils/format.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-pricing-calculation-trace',
  templateUrl: './calculation-trace.component.html',
  styleUrl: '../../infrastructure/styles/pricing-workflow.css',
})
export class PricingCalculationTrace {
  tableColumns1(): DataTableColumn[] {
    return PRICING_CALCULATION_TRACE_TABLE_COLUMNS1;
  }
  tableColumns2(): DataTableColumn[] {
    return PRICING_CALCULATION_TRACE_TABLE_COLUMNS2;
  }
  tableColumns3(): DataTableColumn[] {
    return PRICING_CALCULATION_TRACE_TABLE_COLUMNS3;
  }

  readonly trace = input.required<NonNullable<Calculation['trace']>>();
  readonly money = money;
  readonly percent = (value: Amount) =>
    value == null
      ? '—'
      : new Intl.NumberFormat('ru-RU', {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(value));
  sourceLabel(value: unknown) {
    return source(typeof value === 'string' ? value : null);
  }
  hasAdditional() {
    return (
      Number(
        this.amount(this.trace().actual_margin || {}, 'additional_rate_outside_api_snapshot'),
      ) !== 0
    );
  }
  readonly actualFields = PRICING_CALCULATION_TRACE_ACTUAL_FIELDS;
  readonly variableLabels: Record<string, string> = PRICING_CALCULATION_TRACE_VARIABLE_LABELS;
  variables() {
    return Object.entries(this.trace().minimum_price?.variables || {});
  }
  amount(source: Record<string, unknown>, key: string): Amount {
    const value = source[key];
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  }
  scenarios() {
    const minimum = this.trace().minimum_price;
    return [
      ['using_planned_logistics', 'Плановая логистика'],
      ['using_marketplace_api_min', 'Логистика API · минимум'],
      ['using_marketplace_api_max', 'Логистика API · максимум'],
    ].flatMap(([key, label]) => {
      const value = minimum?.[key];
      return value && typeof value === 'object'
        ? [{ label, values: value as Record<string, unknown> }]
        : [];
    });
  }
}
