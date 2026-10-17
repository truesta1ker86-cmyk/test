import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalFocus } from '../shared/modal-focus';
export type StockChoice = { value: string; label: string };
@Component({
  selector: 'app-stock-choice',
  host: { '[class.roomy]': 'roomy()' },
  imports: [FormsModule, ModalFocus],
  template: `
    <span class="field-label">{{ label() }}</span>
    <button
      class="choice-trigger"
      type="button"
      [attr.aria-label]="label() + ': ' + summary()"
      [attr.aria-expanded]="opened()"
      aria-haspopup="dialog"
      (click)="open()"
    >
      <span class="choice-summary">{{ summary() }}</span
      ><span aria-hidden="true">⌄</span>
    </button>
    @if (opened()) {
      <dialog
        #menu
        class="choice-menu"
        [style.left.px]="position().left"
        [style.top.px]="position().top"
        role="dialog"
        [attr.aria-label]="label()"
        appModalFocus
        (modalEscape)="cancel()"
        (cancel)="$event.preventDefault(); cancel()"
        (click)="backdrop($event)"
      >
        <div class="choice-head">
          <strong>{{ label() }}</strong
          ><button type="button" aria-label="Закрыть фильтр" (click)="cancel()">×</button>
        </div>
        <input
          type="search"
          (keydown.enter)="$event.preventDefault()"
          [attr.aria-label]="'Поиск значений: ' + label()"
          [ngModel]="search()"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="search.set($event)"
          placeholder="Найти значение"
        />
        <div class="choice-actions">
          <button type="button" (click)="selectFound()">Выбрать найденные</button
          ><button type="button" (click)="toggleAll(false)">Снять все</button>
        </div>
        <div class="choice-options">
          <label class="all-values"
            ><input
              type="checkbox"
              [checked]="allValues()"
              [indeterminate]="!allValues() && draft().size > 0"
              (change)="toggleAll($any($event.target).checked)"
            /><span>Все значения</span></label
          >
          @for (item of found(); track item.value) {
            <label
              ><input
                type="checkbox"
                [checked]="draft().has(item.value)"
                (change)="toggle(item.value, $any($event.target).checked)"
              /><span>{{ item.label }}</span></label
            >
          } @empty {
            <p>Значения не найдены</p>
          }
        </div>
        @if (error()) {
          <p class="choice-error" role="alert">{{ error() }}</p>
        }
        <div class="choice-footer">
          <small>{{ allValues() ? 'Все значения' : 'Выбрано: ' + draft().size }}</small
          ><button type="button" (click)="reset()">Сбросить</button
          ><button type="button" (click)="cancel()">Отмена</button
          ><button type="button" class="button primary" (click)="apply()">Применить</button>
        </div>
      </dialog>
    }
  `,
  styleUrl: './stock-choice.css',
})
export class StockChoiceFilter {
  readonly label = input.required<string>();
  readonly options = input<StockChoice[]>([]);
  readonly values = input<string[]>([]);
  readonly roomy = input(false);
  readonly valuesChange = output<string[]>();
  readonly opened = signal(false);
  readonly position = signal({ left: 16, top: 16 });
  readonly allValues = signal(false);
  readonly error = signal('');
  readonly search = signal('');
  readonly draft = signal(new Set<string>());
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menu = viewChild<ElementRef<HTMLDialogElement>>('menu');
  private readonly showMenu = effect(() => {
    const dialog = this.menu()?.nativeElement;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    const anchor = this.element.nativeElement.getBoundingClientRect();
    const box = dialog.getBoundingClientRect();
    this.position.set({
      left: Math.max(16, Math.min(anchor.right - box.width, window.innerWidth - box.width - 16)),
      top: Math.max(16, Math.min(anchor.bottom + 6, window.innerHeight - box.height - 16)),
    });
  });
  readonly choices = computed(() => {
    const choices = new Map(this.options().map((item) => [item.value, item]));
    for (const value of this.values())
      if (!choices.has(value)) choices.set(value, { value, label: value });
    return [...choices.values()];
  });
  readonly summary = computed(() =>
    this.values().length === 1
      ? this.choices().find((item) => item.value === this.values()[0])?.label || this.values()[0]
      : this.values().length
        ? 'Выбрано: ' + this.values().length
        : 'Все',
  );
  readonly found = computed(() => {
    const terms = this.search()
      .toLocaleLowerCase('ru')
      .replaceAll('ё', 'е')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return this.choices().filter((item) =>
      terms.every((term) => item.label.toLocaleLowerCase('ru').replaceAll('ё', 'е').includes(term)),
    );
  });
  open() {
    this.allValues.set(!this.values().length);
    this.draft.set(
      new Set(this.values().length ? this.values() : this.choices().map((item) => item.value)),
    );
    this.error.set('');
    this.search.set('');
    this.opened.set(true);
  }
  toggle(value: string, checked: boolean) {
    this.draft.update((previous) => {
      const next = new Set(previous);
      checked ? next.add(value) : next.delete(value);
      return next;
    });
    this.syncAll();
  }
  selectFound() {
    this.draft.update(
      (previous) =>
        new Set([...(this.allValues() ? [] : previous), ...this.found().map((item) => item.value)]),
    );
    this.syncAll();
  }
  toggleAll(checked: boolean) {
    this.allValues.set(checked);
    this.draft.set(new Set(checked ? this.choices().map((item) => item.value) : []));
    this.error.set('');
  }
  private syncAll() {
    this.allValues.set(
      this.choices().length > 0 && this.choices().every((item) => this.draft().has(item.value)),
    );
    this.error.set('');
  }
  reset() {
    this.valuesChange.emit([]);
    this.cancel();
  }
  backdrop(event: MouseEvent) {
    const dialog = this.menu()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      this.cancel();
  }
  cancel() {
    this.opened.set(false);
  }
  apply() {
    if (!this.allValues() && !this.draft().size) {
      this.error.set('Выберите значения или отметьте «Все значения».');
      return;
    }
    this.valuesChange.emit(
      this.allValues()
        ? []
        : this.choices()
            .filter((item) => this.draft().has(item.value))
            .map((item) => item.value),
    );
    this.opened.set(false);
  }
  @HostListener('document:pointerdown', ['$event']) outside(event: Event) {
    if (
      this.opened() &&
      event.target instanceof Node &&
      !this.element.nativeElement.contains(event.target)
    )
      this.cancel();
  }
}
