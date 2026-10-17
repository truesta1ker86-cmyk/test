import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalFocus } from '../shared/modal-focus';

export interface FinanceColumnRule {
  values: string[] | null;
  text: string;
  operator: 'contains' | 'not_contains';
  min: string;
  max: string;
}
export type FinanceColumnRules = Record<string, FinanceColumnRule>;
export interface FinanceColumnChange {
  field: string;
  rule: FinanceColumnRule | null;
}
export function financeRules(raw: string): Record<string, FinanceColumnRules> {
  try {
    const result = JSON.parse(raw || '{}');
    return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
  } catch {
    return {};
  }
}
@Component({
  selector: 'app-finance-column-filter',
  imports: [FormsModule, ModalFocus],
  template: `
    <button
      type="button"
      class="column-filter-trigger"
      [class.active]="!!rule()"
      [attr.aria-label]="'Фильтр: ' + label()"
      [attr.title]="'Фильтр: ' + label()"
      aria-haspopup="dialog"
      (click)="open()"
    >
      <span aria-hidden="true">▾</span>
    </button>
    @if (opened()) {
      <dialog
        #dialog
        appModalFocus
        class="finance-column-dialog"
        [attr.aria-label]="'Фильтр столбца: ' + label()"
        (cancel)="$event.preventDefault(); opened.set(false)"
        (modalEscape)="opened.set(false)"
      >
        <header>
          <strong>{{ label() }}</strong
          ><button type="button" aria-label="Закрыть фильтр столбца" (click)="opened.set(false)">
            ×
          </button>
        </header>
        <label
          >Условие<select [(ngModel)]="draft.operator" aria-label="Условие текста">
            <option value="contains">Содержит</option>
            <option value="not_contains">Не содержит</option>
          </select></label
        >
        <input [(ngModel)]="draft.text" aria-label="Текст условия" placeholder="Текст условия" />
        @if (numeric()) {
          <div class="bounds">
            <label
              >От<input
                [(ngModel)]="draft.min"
                aria-label="Значение от"
                inputmode="decimal" /></label
            ><label
              >До<input [(ngModel)]="draft.max" aria-label="Значение до" inputmode="decimal"
            /></label>
          </div>
        }
        <input
          [(ngModel)]="search"
          type="search"
          aria-label="Поиск значений"
          placeholder="Найти значение"
        />
        <div class="choices-actions">
          <button type="button" (click)="chosen.set(allValues())">Выбрать все</button
          ><button type="button" (click)="chosen.set([])">Снять все</button>
        </div>
        <div class="choices">
          @for (value of visibleValues(); track value) {
            <label class="choice"
              ><input
                type="checkbox"
                [checked]="chosen().includes(value)"
                (change)="toggle(value)"
              />{{ value === '__empty__' ? '(Пусто / нет данных)' : value }}</label
            >
          }
        </div>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        <footer>
          <button
            type="button"
            class="button"
            (click)="changed.emit({ field: field(), rule: null }); opened.set(false)"
          >
            Сбросить</button
          ><button type="button" class="button primary" (click)="apply()">Применить</button>
        </footer>
      </dialog>
    }
  `,
  styleUrl: './finance-column-filter.css',
})
export class FinanceColumnFilter {
  readonly field = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<string[]>([]);
  readonly numeric = input(false);
  readonly rule = input<FinanceColumnRule | undefined>();
  readonly changed = output<FinanceColumnChange>();
  readonly opened = signal(false);
  readonly chosen = signal<string[]>([]);
  readonly error = signal('');
  search = '';
  draft: FinanceColumnRule = { values: null, text: '', operator: 'contains', min: '', max: '' };
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    effect(() => {
      const d = this.dialog()?.nativeElement;
      if (d && !d.open) d.showModal();
    });
  }
  allValues() {
    return [...new Set([...this.options(), ...(this.rule()?.values || [])])];
  }
  visibleValues() {
    return this.allValues().filter((v) =>
      v.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()),
    );
  }
  toggle(value: string) {
    this.chosen.update((values) =>
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  }
  open() {
    this.draft = { values: null, text: '', operator: 'contains', min: '', max: '', ...this.rule() };
    this.chosen.set(this.draft.values ?? this.allValues());
    this.search = '';
    this.error.set('');
    this.opened.set(true);
  }
  apply() {
    const min = this.draft.min.trim().replace(',', '.'),
      max = this.draft.max.trim().replace(',', '.');
    if (
      [min, max].some((v) => v !== '' && !Number.isFinite(Number(v))) ||
      (min !== '' && max !== '' && Number(min) > Number(max))
    ) {
      this.error.set('Проверьте числовой диапазон.');
      return;
    }
    const values = this.chosen().length === this.allValues().length ? null : this.chosen();
    const rule = { ...this.draft, text: this.draft.text.trim(), min, max, values };
    this.changed.emit({
      field: this.field(),
      rule: values !== null || rule.text || min || max ? rule : null,
    });
    this.opened.set(false);
  }
}
