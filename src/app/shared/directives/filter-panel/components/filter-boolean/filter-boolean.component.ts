import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterBooleanComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-boolean',
  standalone: false,
  templateUrl: './filter-boolean.component.html',
  styleUrls: ['./filter-boolean.component.scss'],
})
export class FilterBooleanComponent extends FilterBaseComponent {
  protected override controlType = 'boolean' as const;
  @Input() onLabel: string = 'Да';
  @Input() offLabel: string = 'Нет';
  @Input() onIcon: string = 'pi pi-check';
  @Input() offIcon: string = 'pi pi-times';
}
