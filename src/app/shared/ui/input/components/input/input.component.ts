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
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UI_INPUT_DEFAULTS } from '../../infrastructure/tokens/input.tokens';
import { UiInputAppearance, UiInputSize, UiInputType } from '../../infrastructure/types/input.types';


@Component({
  selector: 'app-input',
  standalone: false,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  host: {
    '[class.app-input--disabled]': 'isDisabled()',
    '[class.app-input--invalid]': 'invalid()',
    '[class.app-input--compact]': 'size() === "compact"',
    '[class.app-input--large]': 'size() === "large"',
    '[attr.data-appearance]': 'appearance()',
  },
})
export class InputComponent implements ControlValueAccessor {
  private readonly defaults = inject(UI_INPUT_DEFAULTS);

  // ─── Обязательные ──────────────────────────────────────────
  readonly inputId = input.required<string>();
  readonly label = input<string>('');

  // ─── Тип и подсказки ───────────────────────────────────────
  readonly type = input<UiInputType>('text');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('off');
  readonly hint = input<string>('');
  readonly errorMessage = input<string>('');


  readonly listId = input<string | null>(null);

  /**
   * Опции для <datalist>.
   * Если задан — рендерим <datalist> прямо внутри app-input.
   * Это надёжнее, чем держать его снаружи.
   */
  readonly datalistOptions = input<readonly string[] | null>(null);


  readonly size = input<UiInputSize>(this.defaults.size);
  readonly appearance = input<UiInputAppearance>(this.defaults.appearance);
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly required = input<boolean>(false);

  readonly showEmptyLabel = computed(() => this.defaults.showEmptyLabel);


  readonly resolvedListId = computed(() => this.listId());


  readonly hasDatalist = computed(() => Boolean(this.resolvedListId() && this.datalistOptions()));


  readonly value = model<string>('');

  private readonly cvaDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
  readonly invalid = computed(() => Boolean(this.errorMessage()));

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.cvaDisabled.set(d);
  }


  readonly inputChanged = output<string>();
  readonly enterPressed = output<string>();
  readonly focused = output<FocusEvent>();
  readonly blurred = output<FocusEvent>();

  onModelChange(next: string): void {
    this.value.set(next);
    this.onChange(next);
    this.inputChanged.emit(next);
  }

  onEnter(): void {
    this.enterPressed.emit(this.value());
  }
  onFocus(e: FocusEvent): void {
    this.focused.emit(e);
  }
  onBlur(e: FocusEvent): void {
    this.onTouched();
    this.blurred.emit(e);
  }
}
