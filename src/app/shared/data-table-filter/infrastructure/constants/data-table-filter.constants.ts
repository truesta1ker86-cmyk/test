import type { FilterConfig } from '../../../directives/filter-panel/infrastructure/interfaces/filter.interfaces';

export const FILTER_VALUES_PAGE_SIZE = 100;
export const FILTER_MAX_EXPLICIT_VALUES = 1000;
export const FILTER_SEARCH_DELAY = 250;

export function dataTableFilterConfigs(numeric: boolean): FilterConfig[] {
  const validBound = (value: string) =>
    !value || Number.isFinite(Number(value.trim().replace(',', '.')));
  return [
    { key: 'choice_search', order: 0, label: 'Найти значение', type: 'text', defaultValue: '' },
    {
      key: 'values',
      order: 1,
      label: 'Значения',
      type: 'multiselect',
      hidden: true,
      defaultValue: null,
    },
    {
      key: 'excluded_values',
      order: 2,
      label: 'Исключённые значения',
      type: 'multiselect',
      hidden: true,
      defaultValue: [],
    },
    {
      key: 'operator',
      order: 3,
      label: 'Содержит / не содержит',
      type: 'select',
      defaultValue: 'contains',
      options: [
        { value: 'contains', label: 'Содержит' },
        { value: 'not_contains', label: 'Не содержит' },
      ],
    },
    { key: 'text', order: 4, label: 'Текст условия', type: 'text', defaultValue: '' },
    {
      key: 'min',
      order: 5,
      label: 'От',
      type: 'text',
      hidden: !numeric,
      defaultValue: '',
      validation: validBound,
    },
    {
      key: 'max',
      order: 6,
      label: 'До',
      type: 'text',
      hidden: !numeric,
      defaultValue: '',
      validation: (value, all) =>
        validBound(value) &&
        (!value ||
          !all?.['min'] ||
          Number(all['min'].trim().replace(',', '.')) <= Number(value.trim().replace(',', '.'))),
    },
  ];
}
