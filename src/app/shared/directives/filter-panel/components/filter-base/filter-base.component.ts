import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  Output,
  EventEmitter,
  inject,
  effect,
  untracked,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import type { FilterConfig, FilterOption } from '../../infrastructure/interfaces/filter.interfaces';
import type { FilterControlType } from '../../infrastructure/types/filter.types';
import { FilterService } from '../../infrastructure/services/filter.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-base',
  template: '',
  standalone: false,
})
export class FilterBaseComponent implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() key!: string;
  @Input() config?: FilterConfig;
  @Input() showLabel: boolean = true;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() initialValue?: any;
  @Input() options?: FilterOption[];
  @Input() readOnly = false;

  @Output() valueChange = new EventEmitter<any>();
  @Output() errorChange = new EventEmitter<string | null>();
  @Output() userChange = new EventEmitter<any>();

  protected filterService = inject(FilterService);
  private readonly injector = inject(Injector);
  private readonly changeDetector = inject(ChangeDetectorRef);

  public filterConfig: FilterConfig | null = null;
  public value: any = null;
  public error: string | null = null;
  public disabled: boolean = false;

  private destroyEffect: any;
  protected controlType: FilterControlType = 'text';
  private initialized = false;
  private formDisabled = false;
  private configDisabled = false;
  private modelValue: any;
  private hasModelValue = false;
  private dateString = false;
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.initialized) this.registerConfig();
  }

  private registerConfig(): void {
    untracked(() => {
      const configs = this.filterService.configs();
      const existing = configs.find((item) => item.key === this.key);
      const source = this.config ||
        existing || {
          key: this.key,
          label: this.label || this.key,
          type: this.controlType,
          order: configs.length,
          defaultValue:
            this.controlType === 'multiselect'
              ? []
              : this.controlType === 'boolean'
                ? false
                : this.controlType === 'date'
                  ? null
                  : '',
        };
      this.configDisabled =
        this.config?.disabled ?? (this.initialized ? this.configDisabled : !!existing?.disabled);
      const config = {
        ...source,
        ...(this.label ? { label: this.label } : {}),
        ...(this.options ? { options: this.options } : {}),
        disabled: this.configDisabled || this.formDisabled,
      };
      const selected = this.hasModelValue ? this.modelValue : this.filterService.getValue(this.key);
      if (config.options && ['select', 'multiselect'].includes(this.controlType)) {
        const selectedValues = Array.isArray(selected)
          ? selected
          : selected == null || selected === ''
            ? []
            : [selected];
        config.options = [
          ...config.options,
          ...selectedValues
            .filter((value) => !config.options!.some((option) => option.value === value))
            .map((value) => ({ value, label: String(value) })),
        ];
      }
      const values = this.filterService.values();
      if (
        existing &&
        Object.keys(config).every((key) =>
          key === 'options'
            ? JSON.stringify(existing.options) === JSON.stringify(config.options)
            : (existing as any)[key] === (config as any)[key],
        )
      ) {
        this.filterConfig = existing;
        return;
      }
      this.filterService.setConfigs([...configs.filter((item) => item.key !== this.key), config]);
      this.filterService.updateFilters(values);
      this.filterConfig = config;
    });
  }

  writeValue(value: any): void {
    this.hasModelValue = true;
    this.dateString = this.controlType === 'date' && typeof value === 'string';
    this.modelValue = this.dateString && value ? new Date(value + 'T00:00:00') : value;
    if (this.initialized && this.options && ['select', 'multiselect'].includes(this.controlType))
      this.registerConfig();
    if (
      this.initialized &&
      JSON.stringify(this.filterService.getValue(this.key)) !== JSON.stringify(this.modelValue)
    )
      this.filterService.updateFilters({ [this.key]: this.modelValue });
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.formDisabled = disabled;
    if (this.initialized) this.registerConfig();
  }

  ngOnInit() {
    this.registerConfig();
    this.initialized = true;
    this.filterConfig = this.config || this.filterService.getConfig(this.key) || null;
    if (!this.filterConfig) {
      console.error(`Фильтр с ключом "${this.key}" не найден`);
      return;
    }

    if (this.initialValue !== undefined) {
      this.filterService.updateFilter(this.key, this.initialValue);
    }
    if (this.hasModelValue) this.filterService.updateFilters({ [this.key]: this.modelValue });

    this.destroyEffect = effect(
      () => {
        const config = this.filterService.getConfig(this.key) || this.config || null;
        const value = this.filterService.getValue(this.key);
        const error = this.filterService.getError(this.key);
        const disabled = this.filterService.isDisabled(this.key);

        untracked(() => {
          this.filterConfig = config;
          this.value = value;
          this.error = error;
          this.disabled = disabled;
          if (this.hasModelValue && JSON.stringify(this.modelValue) !== JSON.stringify(value)) {
            this.modelValue = value;
            this.onChange(this.toModelValue(value));
          }
          this.valueChange.emit(value);
          this.errorChange.emit(error);
          this.changeDetector.markForCheck();
        });
      },
      { injector: this.injector },
    );
  }

  protected updateValue(value: any): void {
    if (this.readOnly || this.filterService.isDisabled(this.key)) return;
    if (value == null && this.controlType !== 'date')
      value = this.controlType === 'multiselect' ? [] : '';
    this.filterService.updateFilter(this.key, value);
    this.modelValue = value;
    const modelValue = this.toModelValue(value);
    this.onChange(modelValue);
    this.onTouched();
    this.userChange.emit(modelValue);
  }

  private toModelValue(value: any): any {
    return this.dateString && value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
      : (value ??
          (this.controlType === 'multiselect' ? [] : this.controlType === 'boolean' ? false : ''));
  }

  protected getDisplayLabel(): string {
    return this.label || this.filterConfig?.label || this.key;
  }

  protected getPlaceholder(): string {
    return this.placeholder || this.filterConfig?.placeholder || '';
  }

  protected getExtraValue<T>(key: string, defaultValue?: T): T | undefined {
    const extra = this.filterConfig?.extra;
    if (!extra) return defaultValue;
    const value = extra[key];
    return value !== undefined && value !== null ? (value as T) : defaultValue;
  }

  protected getExtraDate(key: 'minDate' | 'maxDate'): Date | null {
    const value = this.getExtraValue<string | Date>(key);
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
  }

  protected getExtraString(key: string, defaultValue: string = ''): string {
    return this.getExtraValue<string>(key, defaultValue) || defaultValue;
  }

  protected getExtraNumber(key: string, defaultValue?: number): number | undefined {
    return this.getExtraValue<number>(key, defaultValue);
  }

  protected hasExtra(key: string): boolean {
    const extra = this.filterConfig?.extra;
    if (!extra) return false;
    return key in extra && extra[key] !== undefined && extra[key] !== null;
  }

  ngOnDestroy() {
    if (this.destroyEffect) {
      this.destroyEffect.destroy();
    }
  }
}
