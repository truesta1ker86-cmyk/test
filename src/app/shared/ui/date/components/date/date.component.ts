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
import { UI_DATE_DEFAULTS } from '../../infrastructure/tokens/date.tokens';
import { UiDateAppearance, UiDateSelectionMode, UiDateSize, UiDateView } from '../../infrastructure/types/date.types';


export type UiDateValue = Date | Date[] | null;

@Component({
  selector: 'app-date',
  standalone: false,
  templateUrl: './date.component.html',
  styleUrl: './date.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateComponent), multi: true },
  ],
  host: {
    '[class.app-date--disabled]': 'isDisabled()',
    '[class.app-date--invalid]': 'invalid()',
    '[class.app-date--compact]': 'size() === "compact"',
    '[class.app-date--large]': 'size() === "large"',
    '[attr.data-appearance]': 'appearance()',
  },
})
export class DateComponent implements ControlValueAccessor {
  private readonly defaults = inject(UI_DATE_DEFAULTS);

  readonly inputId = input.required<string>();
  readonly label = input<string>('');
  readonly placeholder = input<string>('дд.мм.гггг');
  readonly hint = input<string>('');
  readonly errorMessage = input<string>('');
  readonly size = input<UiDateSize>(this.defaults.size);
  readonly appearance = input<UiDateAppearance>(this.defaults.appearance);
  readonly selectionMode = input<UiDateSelectionMode>('single');
  readonly view = input<UiDateView>('date');
  readonly dateFormat = input<string>(this.defaults.dateFormat);
  readonly showTime = input<boolean>(this.defaults.showTime);
  readonly hourFormat = input<'12' | '24'>(this.defaults.hourFormat);
  readonly showIcon = input<boolean>(this.defaults.showIcon);
  readonly showButtonBar = input<boolean>(this.defaults.showButtonBar);
  readonly showClear = input<boolean>(this.defaults.showClear);
  readonly showWeek = input<boolean>(false);
  readonly firstDayOfWeek = input<number>(this.defaults.firstDayOfWeek);
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly numberOfMonths = input<number>(1);
  readonly inline = input<boolean>(false);
  readonly touchUI = input<boolean>(false);
  readonly panelStyleClass = input<string>('app-date-panel');

  readonly value = model<UiDateValue>(null);

  private readonly cvaDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
  readonly invalid = computed(() => Boolean(this.errorMessage()));

  readonly valueChanged = output<UiDateValue>();
  readonly opened = output<void>();
  readonly closed = output<void>();
  readonly cleared = output<void>();
  readonly focused = output<Event>();
  readonly blurred = output<Event>();

  private onChange: (v: UiDateValue) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: UiDateValue): void {
    this.value.set(v ?? null);
  }
  registerOnChange(fn: (v: UiDateValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.cvaDisabled.set(d);
  }

  onModelChange(next: UiDateValue): void {
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
