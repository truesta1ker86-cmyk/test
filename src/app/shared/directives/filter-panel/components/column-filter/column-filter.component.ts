import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FilterService } from '../../infrastructure/services/filter.service';
import type { FilterConfig } from '../../infrastructure/interfaces/filter.interfaces';
import type {
  ColumnRule,
  ColumnChange,
} from '../../infrastructure/interfaces/column-rule.interfaces';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-column-filter',

  providers: [FilterService],
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
  readonly error = signal('');
  readonly filters = inject(FilterService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  allValues() {
    return [...new Set([...this.options(), ...(this.rule()?.values || [])])];
  }

  open() {
    const boundsValid = (value: string) =>
      value === '' || Number.isFinite(Number(value.trim().replace(',', '.')));
    const configs: FilterConfig[] = [
      {
        key: 'operator',
        label: 'Условие',
        type: 'select',
        order: 0,
        group: 'search',
        defaultValue: 'contains',
        options: [
          { value: 'contains', label: 'Содержит' },
          { value: 'not_contains', label: 'Не содержит' },
        ],
      },
      {
        key: 'text',
        label: 'Текст условия',
        type: 'text',
        order: 1,
        group: 'search',
        defaultValue: '',
      },
      {
        key: 'values',
        label: 'Значения',
        type: 'multiselect',
        order: 2,
        defaultValue: null,
        options: this.allValues().map((value) => ({
          value,
          label: value === '__empty__' ? '(Пусто / нет данных)' : value,
        })),
      },
      {
        key: 'min',
        label: 'От',
        type: 'text',
        order: 3,
        group: 'price',
        defaultValue: '',
        hidden: !this.numeric(),
        validation: boundsValid,
      },
      {
        key: 'max',
        label: 'До',
        type: 'text',
        order: 4,
        group: 'price',
        defaultValue: '',
        hidden: !this.numeric(),
        validation: (value, all) =>
          boundsValid(value) &&
          (!all?.['min'] ||
            !value ||
            Number(all['min'].trim().replace(',', '.')) <= Number(value.trim().replace(',', '.'))),
      },
    ];
    this.filters.setConfigs(configs);
    if (this.rule()) this.filters.updateFilters(this.rule()!);
    const selected = this.rule()?.values;
    const options = this.allValues();
    this.filters.updateFilter('values', selected ?? (options.length ? options : null));
    this.error.set('');
    this.opened.set(true);
  }

  apply() {
    if (!this.filters.isValid('min') || !this.filters.isValid('max')) {
      this.error.set('Проверьте числовой диапазон.');
      return;
    }
    const values = this.filters.getValue('values') as string[] | null;
    const all = this.allValues();
    const rule: ColumnRule = {
      values:
        values?.length &&
        values.length === all.length &&
        all.every((value) => values.includes(value))
          ? null
          : values,
      text: this.filters.getValue('text').trim(),
      operator: this.filters.getValue('operator') || 'contains',
      min: this.filters.getValue('min').trim().replace(',', '.'),
      max: this.filters.getValue('max').trim().replace(',', '.'),
    };
    this.changed.emit({
      field: this.field(),
      rule: rule.values !== null || rule.text || rule.min || rule.max ? rule : null,
    });
    this.opened.set(false);
  }

  reset() {
    this.filters.resetAll();
    this.changed.emit({ field: this.field(), rule: null });
    this.opened.set(false);
  }
}
