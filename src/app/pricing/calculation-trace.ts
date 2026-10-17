import { Component, input } from '@angular/core';
import { Amount, Calculation } from '../core/contracts';
import { money, source } from '../core/format';

/** Renders the saved v1 trace without recalculating or mixing plan/API inputs. */
@Component({
  selector: 'app-pricing-calculation-trace',
  templateUrl: './calculation-trace.html',
  styleUrl: './pricing-workflow.css',
})
export class PricingCalculationTrace {
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
  readonly actualFields = [
    ['sale_price', 'Ценовая база Seller API', 'money'],
    ['commission_rate', 'Ставка комиссии', 'rate'],
    ['commission_amount', 'Комиссия', 'money'],
    ['acquiring_amount', 'Эквайринг API', 'money'],
    ['delivery_to_customer', 'Доставка покупателю', 'money'],
    ['direct_flow_min', 'Прямая логистика · минимум', 'money'],
    ['direct_flow_max', 'Прямая логистика · максимум', 'money'],
    ['first_mile_min', 'Первая миля · минимум', 'money'],
    ['first_mile_max', 'Первая миля · максимум', 'money'],
    ['ozon_expenses_low', 'Расходы Ozon · минимум', 'money'],
    ['ozon_expenses_high', 'Расходы Ozon · максимум', 'money'],
    ['net_payout_low', 'Начислено после Ozon · нижняя граница', 'money'],
    ['net_payout_high', 'Начислено после Ozon · верхняя граница', 'money'],
    ['actual_cost', 'Себестоимость только из API', 'money'],
    ['profit_low', 'Прибыль · нижняя граница', 'money'],
    ['profit_high', 'Прибыль · верхняя граница', 'money'],
    ['selected_margin', 'Маржа API: прибыль / начислено после Ozon', 'rate'],
    ['margin_on_sale_price_low', 'Маржа от цены продажи · нижняя граница', 'rate'],
    ['margin_on_sale_price_high', 'Маржа от цены продажи · верхняя граница', 'rate'],
  ];
  readonly variableLabels: Record<string, string> = {
    cost: 'Себестоимость',
    margin: 'Целевая маржа',
    target_margin: 'Целевая маржа',
    is_rfbs: 'План rFBS',
    fbs_expenses: 'Расходы FBS',
    rfbs_expenses: 'Расходы rFBS',
    advertising_rate: 'Реклама',
    brand_promotion_rate: 'Продвижение бренда',
    promotion_adjustment_rate: 'Корректировка акций',
    commission: 'Комиссия',
    logistics: 'Логистика',
    acquiring: 'Эквайринг',
    other_fees: 'Прочие расходы',
    handling_fee: 'Обработка',
    last_mile_fee: 'Последняя миля',
    handling: 'Обработка',
    last_mile: 'Последняя миля',
  };
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
