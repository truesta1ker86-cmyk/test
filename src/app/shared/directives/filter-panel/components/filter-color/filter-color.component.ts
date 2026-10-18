import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterColorComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-color',
  standalone: false,
  templateUrl: './filter-color.component.html',
  styleUrls: ['./filter-color.component.scss'],
})
export class FilterColorComponent extends FilterBaseComponent {
  protected override controlType = 'color' as const;
}
