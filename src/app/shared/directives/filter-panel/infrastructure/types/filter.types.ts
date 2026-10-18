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

export type FilterValues = Record<string, any>;

export type ValidFilterValues = Partial<FilterValues>;
