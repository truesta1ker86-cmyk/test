// input.types.ts
export type UiInputType = 'text' | 'search' | 'number' | 'email' | 'tel' | 'url' | 'password';
export type UiInputSize = 'compact' | 'normal' | 'large';
export type UiInputAppearance = 'default' | 'filled' | 'outline';

export interface UiInputConfig {
  size: UiInputSize;
  appearance: UiInputAppearance;
  showEmptyLabel: boolean;
}
