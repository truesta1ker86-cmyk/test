import { editorFields } from '../../../../infrastructure/constants/editor-fields.constants';

export const PRICING_FILTER_SCHEMES = [
  { value: 'FBS', label: 'FBS' },
  { value: 'FBO', label: 'FBO' },
  { value: 'RFBS', label: 'РФБС' },
];

export const PRICING_FILTERS_CONDITION_FIELDS = [
  { key: 'offer_id', label: 'Артикул' },
  { key: 'name', label: 'Номенклатура' },
  ...editorFields,
  { key: 'effective_cost', label: 'Расчётная себестоимость' },
  { key: 'calculated_price', label: 'Расчётная цена' },
  { key: 'working_min_price', label: 'Минималка' },
];
