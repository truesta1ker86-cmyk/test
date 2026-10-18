import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterSliderComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-slider',
  standalone: false,
  templateUrl: './filter-slider.component.html',
  styleUrls: ['./filter-slider.component.scss'],
})
export class FilterSliderComponent extends FilterBaseComponent {
  protected override controlType = 'slider' as const;
  public get displayValue(): string {
    return this.value !== null && this.value !== undefined ? String(this.value) : '0';
  }
}
