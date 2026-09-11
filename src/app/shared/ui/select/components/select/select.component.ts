import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UI_SELECT_DEFAULTS } from '../../infrastructure/tokens/select.tokens';
import { UiSelectAppearance, UiSelectFilterMatchMode, UiSelectOption, UiSelectSize } from '../../infrastructure/types/select.types';

@Component({
  selector: 'app-select',
  standalone: false,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
  host: {
    '[class.app-select--disabled]': 'isDisabled()',
    '[class.app-select--invalid]': 'invalid()',
    '[class.app-select--compact]': 'size() === "compact"',
    '[class.app-select--large]': 'size() === "large"',
    '[attr.data-appearance]': 'appearance()',
  },
})
export class SelectComponent<T = unknown> implements ControlValueAccessor {
  private readonly defaults = inject(UI_SELECT_DEFAULTS);

  readonly inputId = input.required<string>();
  readonly label = input<string>('');
  readonly options = input<UiSelectOption<T>[]>([]);
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly errorMessage = input<string>('');
  readonly size = input<UiSelectSize>(this.defaults.size);
  readonly appearance = input<UiSelectAppearance>(this.defaults.appearance);
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly showClear = input<boolean>(this.defaults.showClear);
  readonly filter = input<boolean>(this.defaults.filter);
  readonly filterMatchMode = input<UiSelectFilterMatchMode>(this.defaults.filterMatchMode);
  readonly filterPlaceholder = input<string>('Поиск…');
  readonly emptyMessage = input<string>(this.defaults.emptyMessage);
  readonly emptyFilterMessage = input<string>(this.defaults.emptyFilterMessage);
  readonly optionLabel = input<string>('label');
  readonly optionValue = input<string | undefined>(undefined);
  readonly optionDisabled = input<string>('disabled');
  readonly group = input<boolean>(false);
  readonly panelStyleClass = input<string>('');
  readonly scrollHeight = input<string>('240px');

  readonly value = model<T | null>(null);

  private readonly cvaDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
  readonly invalid = computed(() => Boolean(this.errorMessage()));

  readonly valueChanged = output<T | null>();
  readonly opened = output<void>();
  readonly closed = output<void>();
  readonly cleared = output<void>();
  readonly focused = output<Event>();
  readonly blurred = output<Event>();
  readonly filterChanged = output<string>();

  private onChange: (v: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: T | null): void {
    this.value.set(v ?? null);
  }
  registerOnChange(fn: (v: T | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.cvaDisabled.set(d);
  }

  onModelChange(next: T | null): void {
    this.value.set(next);
    this.onChange(next);
    this.valueChanged.emit(next);
  }

  onFocus(e: Event): void {
    this.focused.emit(e);
  }
  onBlur(e: Event): void {
    this.onTouched();
    this.blurred.emit(e);
  }
  onClear(): void {
    this.cleared.emit();
  }
}
