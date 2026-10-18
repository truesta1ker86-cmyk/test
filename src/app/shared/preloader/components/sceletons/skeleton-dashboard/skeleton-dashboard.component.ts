import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-dashboard',
  standalone: false,
  templateUrl: './skeleton-dashboard.component.html',
  styleUrl: './skeleton-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonDashboardComponent {
  /** Количество метрик-карточек. */
  readonly metrics = input<number>(4);

  /** Показывать график. */
  readonly withChart = input<boolean>(true);

  /** Показывать таблицу. */
  readonly withTable = input<boolean>(true);

  protected readonly array = Array;
}
