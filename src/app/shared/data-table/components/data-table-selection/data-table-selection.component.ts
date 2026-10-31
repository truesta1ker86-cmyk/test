import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-data-table-selection',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label>
      <input
        type="checkbox"
        [attr.aria-label]="'Выбрать все товары по фильтру на всех страницах: ' + total()"
        [checked]="checked()"
        [indeterminate]="indeterminate()"
        [disabled]="disabled() || !total()"
        (change)="selectionChange.emit($any($event.target).checked)"
      />
      <span>Все по фильтру · {{ total() }}<small>На всех страницах</small></span>
    </label>
  `,
  styles: `
    label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    input {
      width: 16px;
      height: 16px;
      accent-color: var(--brand);
      flex: 0 0 auto;
    }
    span {
      font-size: 12px;
      line-height: 1.35;
    }
    small {
      display: block;
      font-size: 10px;
      color: var(--muted);
    }
    label:has(input:disabled) {
      cursor: default;
      opacity: 0.6;
    }
  `,
})
export class DataTableSelectionComponent {
  readonly total = input(0);
  readonly checked = input(false);
  readonly indeterminate = input(false);
  readonly disabled = input(false);
  readonly selectionChange = output<boolean>();
}
