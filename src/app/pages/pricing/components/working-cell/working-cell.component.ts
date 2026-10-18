import {
  ChangeDetectionStrategy,
  afterRenderEffect,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { displayInput, editorValue } from '../../infrastructure/utils/editor-fields.utils';
import { money, percent } from '../../../../core/infrastructure/utils/format.utils';
import type { Amount } from '../../../../core/infrastructure/types/contracts.types';
import type { WorkingCellChange } from './infrastructure/interfaces/working-cell.interfaces';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-pricing-working-cell',

  template: `
    @if (opened()) {
      <div class="cell-editor">
        <input
          #entry
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          [attr.aria-label]="label() + ' — ' + offer()"
          inputmode="decimal"
          [disabled]="busy()"
          (keydown.enter)="$event.preventDefault(); commit()"
          (keydown.escape)="$event.stopPropagation(); cancel()"
        />
        <button
          type="button"
          [attr.aria-label]="'Сохранить ' + label() + ' — ' + offer()"
          [disabled]="busy()"
          (click)="commit()"
        >
          ✓
        </button>
        <button
          type="button"
          [attr.aria-label]="'Отменить ' + label() + ' — ' + offer()"
          [disabled]="busy()"
          (click)="cancel()"
        >
          ×
        </button>
      </div>
      <small>Пустое поле возвращает расчёт по формуле.</small>
      @if (error()) {
        <small role="alert">{{ error() }}</small>
      }
    } @else {
      <button
        type="button"
        class="working-value"
        [disabled]="busy()"
        [attr.aria-label]="'Изменить ' + label() + ' — ' + offer()"
        title="Двойной клик — изменить. Enter — открыть редактор."
        (dblclick)="begin()"
        (click)="single() && begin()"
        (keydown.enter)="$event.preventDefault(); begin()"
      >
        {{ field() === 'margin' ? percent(value()) : money(value()) }}
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .working-value {
      border: 0;
      background: none;
      color: inherit;
      padding: 0;
      font: inherit;
      cursor: pointer;
    }
    .working-value:focus-visible {
      outline: 2px solid var(--brand);
      outline-offset: 4px;
    }
    .cell-editor {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    input {
      min-width: 100px;
      width: 130px;
      padding: 7px;
      border: 1px solid var(--brand);
      border-radius: 5px;
      font: inherit;
    }
    .cell-editor button {
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--surface);
      cursor: pointer;
    }
    small {
      display: block;
      max-width: 220px;
      margin-top: 6px;
      font-size: 11px;
      font-weight: 400;
    }
    [role='alert'] {
      color: var(--danger, #b42318);
    }
  `,
})
export class PricingWorkingCell {
  readonly field = input.required<WorkingCellChange['field']>();
  readonly value = input<Amount>(null);
  readonly offer = input.required<string>();
  readonly label = input.required<string>();
  readonly single = input(false);
  readonly busy = input(false);
  readonly changed = output<WorkingCellChange>();
  readonly opened = signal(false);
  readonly draft = signal('');
  readonly error = signal('');
  readonly money = money;
  readonly percent = percent;
  private readonly entry = viewChild<ElementRef<HTMLInputElement>>('entry');
  constructor() {
    afterRenderEffect(() => {
      const entry = this.entry()?.nativeElement;
      if (entry) {
        entry.focus();
        entry.select();
      }
    });
  }
  begin() {
    this.draft.set(
      this.value() == null
        ? ''
        : this.field() === 'margin'
          ? displayInput(
              { key: 'margin', label: 'Маржа', kind: 'rate', nullable: true },
              this.value(),
            )
          : String(this.value()),
    );
    this.error.set('');
    this.opened.set(true);
  }
  cancel() {
    if (!this.busy()) {
      this.opened.set(false);
      this.error.set('');
    }
  }
  commit() {
    if (this.busy()) return;
    this.error.set('');
    try {
      const field = this.field();
      const reset = !this.draft().trim();
      const value = reset
        ? null
        : editorValue(
            {
              key: field,
              label: this.label(),
              kind: field === 'margin' ? 'rate' : 'number',
              nullable: false,
            },
            this.draft(),
          );
      if (
        !reset &&
        (field === 'margin' ? Number(value) <= -1 || Number(value) >= 1 : Number(value) <= 0)
      )
        throw new Error(
          field === 'margin'
            ? 'Маржа должна быть больше −100% и меньше 100%.'
            : 'Цена должна быть больше нуля.',
        );
      this.changed.emit({ field, value, reset });
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
}
