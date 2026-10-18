import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, Output, EventEmitter } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterMultiselectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-multiselect',
  standalone: false,
  templateUrl: './filter-multiselect.component.html',
  styleUrls: ['./filter-multiselect.component.scss'],
})
export class FilterMultiselectComponent extends FilterBaseComponent {
  protected override controlType = 'multiselect' as const;
  @Output() filterChanged = new EventEmitter<string>();
}
