import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-table',
  standalone: false,
  templateUrl: './skeleton-table.component.html',
  styleUrl: './skeleton-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonTableComponent {
  /** Количество строк. */
  readonly rows = input<number>(8);

  /** Количество колонок. */
  readonly columns = input<number>(5);

  /** Показывать ли строку заголовков. */
  readonly showHeader = input<boolean>(true);

  /** Имитировать чекбокс в первой колонке. */
  readonly withCheckbox = input<boolean>(false);

  /** Массив для @for. */
  protected readonly array = Array;
}