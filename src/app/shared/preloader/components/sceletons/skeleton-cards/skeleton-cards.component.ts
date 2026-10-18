import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-cards',
  standalone: false,
  templateUrl: './skeleton-cards.component.html',
  styleUrl: './skeleton-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonCardsComponent {
  /** Количество карточек. */
  readonly count = input<number>(8);

  /** Минимальная ширина карточки. */
  readonly minWidth = input<number>(240);

  /** Показывать изображение. */
  readonly withImage = input<boolean>(true);

  protected readonly array = Array;
}
