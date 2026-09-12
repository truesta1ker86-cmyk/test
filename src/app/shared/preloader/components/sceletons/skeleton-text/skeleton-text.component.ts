import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-text',
  standalone: false,
  templateUrl: './skeleton-text.component.html',
  styleUrl: './skeleton-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonTextComponent {
  /** Количество строк. */
  readonly lines = input<number>(4);

  /** Ширина последней строки (для естественности). */
  readonly lastLineWidth = input<string>('60%');

  /** Первая строка — заголовок. */
  readonly withTitle = input<boolean>(false);

  protected readonly array = Array;

  readonly lineHeight = input<number>(12);
  readonly lineHeightPx = computed(() => `${this.lineHeight()}px`);
}
