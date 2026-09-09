export type FilterControlType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'date' 
  | 'daterange' 
  | 'boolean' 
  | 'slider'
  | 'color'
  | 'autocomplete';

export interface FilterOption {
  value: any;
  label: string;
  disabled?: boolean;
  children?: FilterOption[];
}

export interface FilterExtra {
  prefix?: string;
  suffix?: string;
  minDate?: string | Date;
  maxDate?: string | Date;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: any;
}

export interface FilterConfig<T = any> {
  key: string;
  label: string;
  type: FilterControlType;
  defaultValue?: T;
  placeholder?: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  validation?: (value: T, allValues?: Record<string, any>) => boolean;
  errorMessage?: string;
  disabled?: boolean;
  hidden?: boolean;
  dependsOn?: string | string[];
  dependsOnValue?: any;
  order: number;
  group?: string;  
  width?: string;
  extra?: FilterExtra;
}

export type FilterValues = Record<string, any>;
export type ValidFilterValues = Partial<FilterValues>;

export const GROUP_LABELS: Record<string, string> = {
  'main': 'Основные',
  'price': 'Цена',
  'additional': 'Дополнительно',
  'date': 'Дата',
  'visual': 'Визуальные',
  'search': 'Поиск',
  'brands': 'Бренды',
  'sizes': 'Размеры',
  'colors': 'Цвета',
  'materials': 'Материалы',
  'contacts': 'Контакты',
  'personal': 'Персональные',
  'finance': 'Финансы',
  'admin': 'Администрирование',
  'management': 'Управление'
};

export const GROUP_ICONS: Record<string, string> = {
  'main': 'pi pi-home',
  'price': 'pi pi-money-bill',
  'additional': 'pi pi-cog',
  'date': 'pi pi-calendar',
  'visual': 'pi pi-palette',
  'search': 'pi pi-search',
  'brands': 'pi pi-tag',
  'sizes': 'pi pi-arrows-h',
  'colors': 'pi pi-palette',
  'materials': 'pi pi-box',
  'contacts': 'pi pi-phone',
  'personal': 'pi pi-user',
  'finance': 'pi pi-dollar',
  'admin': 'pi pi-shield',
  'management': 'pi pi-users'
};
