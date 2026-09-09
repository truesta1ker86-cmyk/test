import { FilterConfig } from "../../../../shared/directives/filter-panel/infrastructure/models/filter.model";

export interface AllocationFilterOptions {
  categories: { value: string; label: string }[];
  types: { value: string; label: string }[];
  brands: string[];
  groups: string[];
  series: string[];
  lengths: string[];
  colors: string[];
  packages: string[];
}

export function buildAllocationFilterConfig(options: AllocationFilterOptions): FilterConfig[] {
  return [
    {
      key: 'category',
      label: 'Категория',
      type: 'select',
      options: options.categories.map(cat => ({ value: cat.value, label: cat.label })),
      defaultValue: '',
      order: 10,
    },
    {
      key: 'type',
      label: 'Тип товара',
      type: 'select',
      options: options.types.map(t => ({ value: t.value, label: t.label })),
      defaultValue: '',
      order: 20,
    },
    {
      key: 'group',
      label: 'Подгруппа',
      type: 'select',
      options: options.groups.map(g => ({ value: g, label: g })),
      defaultValue: '',
      order: 30,
      dependsOn: ['category', 'type'],
    },
    {
      key: 'brand',
      label: 'Бренд',
      type: 'select',
      options: options.brands.map(b => ({ value: b, label: b })),
      defaultValue: '',
      order: 40,
    },
    {
      key: 'series',
      label: 'Серия',
      type: 'select',
      options: options.series.map(s => ({ value: s, label: s })),
      defaultValue: '',
      order: 50,
    },
    {
      key: 'length',
      label: 'Длина',
      type: 'select',
      options: options.lengths.map(l => ({ value: l, label: l })),
      defaultValue: '',
      order: 60,
    },
    {
      key: 'color',
      label: 'Цвет',
      type: 'select',
      options: options.colors.map(c => ({ value: c, label: c })),
      defaultValue: '',
      order: 70,
    },
    {
      key: 'package',
      label: 'Упаковка',
      type: 'select',
      options: options.packages.map(p => ({ value: p, label: p })),
      defaultValue: '',
      order: 80,
    },
  ];
}