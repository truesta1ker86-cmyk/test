import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalFocus } from '../../../modal-focus/modal-focus.directive';

import { ColumnRule, ColumnChange } from '../../infrastructure/models/filter.model';

@Component({
  selector: 'app-column-filter',
  imports: [FormsModule, ModalFocus],
  templateUrl: './column-filter.component.html',
  styleUrl: './column-filter.component.css',
})
export class ColumnFilterComponent {
  readonly field = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<string[]>([]);
  readonly numeric = input(false);
  readonly rule = input<ColumnRule | undefined>();
  readonly changed = output<ColumnChange>();
  readonly opened = signal(false);
  readonly chosen = signal<string[]>([]);
  readonly error = signal('');
  search = '';
  draft: ColumnRule = { values: null, text: '', operator: 'contains', min: '', max: '' };
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
