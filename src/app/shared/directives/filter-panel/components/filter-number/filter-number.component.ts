import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterNumberComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-number',
  standalone: false,
  templateUrl: './filter-number.component.html',
  styleUrls: ['./filter-number.component.scss'],
})
export class FilterNumberComponent extends FilterBaseComponent {
  protected override controlType = 'number' as const;
  get prefix(): string {
    return this.filterConfig?.extra?.['prefix'] || '';
  }

  get suffix(): string {
    return this.filterConfig?.extra?.['suffix'] || '';
  }

  // Альтернативный вариант с типизацией
  get extra(): any {
    return this.filterConfig?.extra || {};
  }
}
