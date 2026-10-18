import type { DataTableColumn } from '../../../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';

export const PRICING_CALCULATION_TRACE_TABLE_COLUMNS1: DataTableColumn[] = [
  { field: 'column_1', header: 'Показатель', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Значение снимка', cellTemplate: { slot: 'cell2' } },
];

export const PRICING_CALCULATION_TRACE_TABLE_COLUMNS2: DataTableColumn[] = [
  { field: 'column_1', header: 'Вход формулы', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Значение', cellTemplate: { slot: 'cell2' } },
];

export const PRICING_CALCULATION_TRACE_TABLE_COLUMNS3: DataTableColumn[] = [
  { field: 'column_1', header: 'Сценарий', cellTemplate: { slot: 'cell1' } },
  { field: 'column_2', header: 'Минималка', cellTemplate: { slot: 'cell2' } },
  { field: 'column_3', header: 'Цена', cellTemplate: { slot: 'cell3' } },
  { field: 'column_4', header: 'Цена до скидки', cellTemplate: { slot: 'cell4' } },
];

export const PRICING_CALCULATION_TRACE_ACTUAL_FIELDS = [
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

export const PRICING_CALCULATION_TRACE_VARIABLE_LABELS: Record<string, string> = {
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
