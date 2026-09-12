import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-skeleton-form',
  standalone: false,
  templateUrl: './skeleton-form.component.html',
  styleUrl: './skeleton-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonFormComponent {
  /** Количество полей. */
  readonly fields = input<number>(5);

  /** Количество колонок. */
  readonly columns = input<number>(2);

  /** Показывать кнопку внизу. */
  readonly withActions = input<boolean>(true);

  protected readonly array = Array;
}
