import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterSelectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-select',
  standalone: false,
  templateUrl: './filter-select.component.html',
  styleUrls: ['./filter-select.component.scss'],
})
export class FilterSelectComponent extends FilterBaseComponent {
  protected override controlType = 'select' as const;
  getSelectedLabel(): string {
    if (!this.filterConfig?.options) return '';
    const option = this.filterConfig.options.find((opt) => opt.value === this.value);
    return option?.label || this.value || '';
  }
}
