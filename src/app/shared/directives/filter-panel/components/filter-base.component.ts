// components/filter-base.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  effect,
  untracked,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FilterConfig } from '../infrastructure/models/filter.model';
import { FilterService } from '../infrastructure/services/filter.service';


@Component({
  selector: 'app-filter-base',
  template: '',
  standalone: false,
})
export class FilterBaseComponent implements OnInit, OnDestroy {
  @Input() key!: string;
  @Input() config?: FilterConfig;
  @Input() showLabel: boolean = true;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() initialValue?: any;

  @Output() valueChange = new EventEmitter<any>();
  @Output() errorChange = new EventEmitter<string | null>();

  protected filterService = inject(FilterService);

  public filterConfig: FilterConfig | null = null;
  public value: any = null;
  public error: string | null = null;
  public disabled: boolean = false;

  private destroyEffect: any;

  ngOnInit() {
    this.filterConfig = this.config || this.filterService.getConfig(this.key) || null;
    if (!this.filterConfig) {
      console.error(`Фильтр с ключом "${this.key}" не найден`);
      return;
    }

    if (this.initialValue !== undefined) {
      this.filterService.updateFilter(this.key, this.initialValue);
    }

    this.destroyEffect = effect(() => {
      const value = this.filterService.getValue(this.key);
      const error = this.filterService.getError(this.key);
      const disabled = this.filterService.isDisabled(this.key);

      untracked(() => {
        this.value = value;
        this.error = error;
        this.disabled = disabled;
        this.valueChange.emit(value);
        this.errorChange.emit(error);
      });
    });
  }

  protected updateValue(value: any): void {
    this.filterService.updateFilter(this.key, value);
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
    return value !== undefined && value !== null ? value as T : defaultValue;
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
