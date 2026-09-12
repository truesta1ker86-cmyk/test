import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-skeleton-data-table',
  standalone: false,
  templateUrl: './skeleton-data-table.component.html',
  styleUrl: './skeleton-data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonDataTableComponent {
  readonly rows = input<number>(10);
  readonly columns = input<number>(5);
  readonly withCheckbox = input<boolean>(false);
  protected readonly array = Array;
}
