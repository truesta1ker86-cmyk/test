import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, errorMessage } from '../core/api';
import { ModalFocus } from '../shared/modal-focus';
import { PricingQuery, pricingScopeFilters } from './pricing-query';
export interface PriceColumnFilter {
  values: string[];
  text: string;
  operator: string;
  min: string;
  max: string;
}
export interface PriceColumnChange {
  field: string;
  value: PriceColumnFilter | null;
}
export function priceColumns(raw: string): Record<string, PriceColumnFilter> {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}
@Component({
  selector: 'app-pricing-column-filter',
  imports: [FormsModule, ModalFocus],
  template: ` <button
      type="button"
      class="column-filter-trigger"
      [class.active]="active()"
      [attr.aria-label]="'Фильтр: ' + label()"
      [attr.title]="'Фильтр: ' + label()"
      aria-haspopup="dialog"
      (click)="open()"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 6h10l-5 5z" fill="currentColor" />
      </svg>
    </button>
    @if (opened()) {
      <dialog
        #dialog
        class="price-column-dialog"
        [attr.aria-label]="'Фильтр столбца: ' + label()"
        appModalFocus
        (modalEscape)="opened.set(false)"
        (cancel)="$event.preventDefault(); opened.set(false)"
      >
        <header>
          <strong>{{ label() }}</strong
          ><button type="button" aria-label="Закрыть фильтр столбца" (click)="opened.set(false)">
            ×
          </button>
        </header>
        @if (error()) {
          <p role="alert" class="workflow-error">{{ error() }}</p>
        }
        <label
          >Условие<select aria-label="Условие текста" [(ngModel)]="draft.operator">
            <option value="contains">Содержит</option>
            <option value="not_contains">Не содержит</option></select
          ><input aria-label="Текст условия" [(ngModel)]="draft.text"
        /></label>
        @if (numeric()) {
          <div class="column-bounds">
            <label
              >От<input
                aria-label="Значение от"
                inputmode="decimal"
                [(ngModel)]="draft.min" /></label
            ><label
              >До<input aria-label="Значение до" inputmode="decimal" [(ngModel)]="draft.max"
            /></label>
          </div>
        }
        <input
          type="search"
          aria-label="Поиск значений столбца"
          placeholder="Найти значение"
          [(ngModel)]="search"
        />
        <div class="column-actions">
          <button type="button" (click)="selectFound()" [disabled]="busy()">
            Выбрать найденные</button
          ><button type="button" (click)="toggleAll(false)">Снять все</button>
        </div>
        <div class="column-options">
          <label
            ><input
              type="checkbox"
              [checked]="all()"
              [indeterminate]="!all() && selected().size > 0"
              (change)="toggleAll($any($event.target).checked)"
            />Все значения</label
          >
          @for (value of found(); track value) {
            <label
              ><input
                type="checkbox"
                [checked]="selected().has(value)"
                (change)="toggle(value, $any($event.target).checked)"
              />{{ value === '__empty__' ? '(Пусто / нет данных)' : value }}</label
            >
          }
          @if (busy()) {
            <p role="status">Загружаем значения всего отбора…</p>
          }
        </div>
        <footer>
          <button type="button" class="button" (click)="reset()">Сбросить</button
          ><button type="button" class="button" (click)="opened.set(false)">Отмена</button
          ><button type="button" class="button primary" (click)="apply()" [disabled]="busy()">
            Применить
          </button>
        </footer>
      </dialog>
    }`,
  styles: `
    :host {
      display: inline-block;
    }
    .column-filter-trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid #dce0e7;
      border-radius: 6px;
      background: var(--surface);
      cursor: pointer;
      padding: 0 !important;
      font-size: 12px !important;
      color: var(--muted) !important;
    }
    .column-filter-trigger.active {
      color: var(--brand) !important;
      background: var(--brand-soft);
      border-color: var(--brand);
    }
    .price-column-dialog {
      text-transform: none;
      letter-spacing: normal;
      font-weight: 400;
      width: 360px;
      max-width: calc(100vw - 24px);
      max-height: calc(100dvh - 24px);
      margin: auto;
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text);
      font-size: 12px;
      overflow: auto;
    }
    .price-column-dialog::backdrop {
      background: #0f172a33;
    }
    header,
    footer,
    .column-actions,
    .column-bounds {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
    }
    header {
      margin-bottom: 12px;
    }
    header button {
      font-size: 22px;
    }
    footer {
      margin-top: 14px;
    }
    footer button {
      font-size: 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 8px;
      text-align: left;
    }
    input,
    select {
      width: 100%;
      box-sizing: border-box;
      min-height: 32px;
    }
    .column-bounds label {
      min-width: 0;
      width: 50%;
    }
    .column-options {
      max-height: 28vh;
      overflow: auto;
      border-block: 1px solid var(--border);
      margin: 8px 0;
    }
    .column-options label {
      display: flex;
      flex-direction: row;
      gap: 8px;
      align-items: center;
      padding: 7px 0;
      margin: 0;
    }
    .column-options input {
      width: 16px;
      height: 16px;
      min-height: 16px;
    }
    .column-actions {
      margin-top: 8px;
    }
    .workflow-error {
      color: #b42318;
    }
  `,
})
export class PricingColumnFilter {
  readonly field = input.required<string>();
  readonly label = input.required<string>();
  readonly numeric = input(false);
  readonly query = input.required<PricingQuery>();
  readonly changed = output<PriceColumnChange>();
  readonly opened = signal(false);
  readonly options = signal<string[]>([]);
  readonly selected = signal(new Set<string>());
  readonly all = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  search = '';
  draft: PriceColumnFilter = { values: [], text: '', operator: 'contains', min: '', max: '' };
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly show = effect(() => {
    const d = this.dialog()?.nativeElement;
    if (d && !d.open) d.showModal();
  });
  active() {
    return !!priceColumns(this.query().column_filters)[this.field()];
  }
  open() {
    this.draft = structuredClone(
      priceColumns(this.query().column_filters)[this.field()] || {
        values: [],
        text: '',
        operator: 'contains',
        min: '',
        max: '',
      },
    );
    this.search = '';
    this.error.set('');
    this.opened.set(true);
    this.busy.set(true);
    this.all.set(!this.draft.values.length);
    this.api
      .pricingColumnValues(this.field(), pricingScopeFilters(this.query()))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          const options = [...new Set([...r.values, ...this.draft.values])];
          this.options.set(options);
          this.selected.set(new Set(this.all() ? options : this.draft.values));
          this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  found() {
    const q = this.search.toLocaleLowerCase('ru').replaceAll('ё', 'е');
    return this.options().filter((v) =>
      (v === '__empty__' ? '(Пусто / нет данных)' : v)
        .toLocaleLowerCase('ru')
        .replaceAll('ё', 'е')
        .includes(q),
    );
  }
  toggleAll(value: boolean) {
    this.all.set(value);
    this.selected.set(new Set(value ? this.options() : []));
  }
  toggle(value: string, checked: boolean) {
    this.selected.update((previous) => {
      const next = new Set(previous);
      checked ? next.add(value) : next.delete(value);
      return next;
    });
    this.all.set(this.options().length > 0 && this.options().every((v) => this.selected().has(v)));
  }
  selectFound() {
    this.selected.update((previous) => new Set([...(this.all() ? [] : previous), ...this.found()]));
    this.all.set(this.options().length > 0 && this.options().every((v) => this.selected().has(v)));
  }
  reset() {
    this.changed.emit({ field: this.field(), value: null });
    this.opened.set(false);
  }
  apply() {
    if (!this.all() && !this.selected().size) {
      this.error.set('Выберите значения или отметьте «Все значения».');
      return;
    }
    const min = this.draft.min.replace(',', '.'),
      max = this.draft.max.replace(',', '.');
    if (
      (min && !Number.isFinite(Number(min))) ||
      (max && !Number.isFinite(Number(max))) ||
      (min && max && Number(min) > Number(max))
    ) {
      this.error.set('Проверьте диапазон от и до.');
      return;
    }
    const value = { ...this.draft, min, max, values: this.all() ? [] : [...this.selected()] };
    this.changed.emit({
      field: this.field(),
      value: value.values.length || value.text || value.min || value.max ? value : null,
    });
    this.opened.set(false);
  }
}
