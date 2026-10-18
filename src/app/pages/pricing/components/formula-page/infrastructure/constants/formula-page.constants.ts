import type { EditorField } from '../../../../infrastructure/interfaces/editor-fields.interfaces';

export const FORMULA_PAGE_PARAMETER_FIELDS: EditorField[] = [
  { key: 'price_divisor', label: 'Делитель цены', kind: 'number', nullable: false },
  { key: 'old_price_divisor', label: 'Делитель старой цены', kind: 'number', nullable: false },
  { key: 'handling_fee', label: 'Обработка, ₽', kind: 'number', nullable: false },
  { key: 'last_mile_fee', label: 'Последняя миля, ₽', kind: 'number', nullable: false },
  { key: 'acquiring_percent', label: 'Эквайринг, %', kind: 'rate', nullable: false },
  { key: 'other_fees_percent', label: 'Прочие начисления, %', kind: 'rate', nullable: false },
  { key: 'rfbs_delivery_percent', label: 'Доставка РФБС, %', kind: 'rate', nullable: false },
  { key: 'fbs_expenses_percent', label: 'Расходы FBS, %', kind: 'rate', nullable: false },
  { key: 'rfbs_expenses_percent', label: 'Расходы РФБС, %', kind: 'rate', nullable: false },
];
