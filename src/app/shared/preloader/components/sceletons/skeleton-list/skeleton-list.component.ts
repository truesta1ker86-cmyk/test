import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-list',
  standalone: false,
  templateUrl: './skeleton-list.component.html',
  styleUrl: './skeleton-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonListComponent {
  /** Количество строк. */
  readonly count = input<number>(6);

  /** Показывать аватар/иконку. */
  readonly withAvatar = input<boolean>(true);

  /** Показывать вторую строку. */
  readonly withSecondary = input<boolean>(true);

  protected readonly array = Array;
}
