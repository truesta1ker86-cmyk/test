import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FilterTextComponent), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-text',
  standalone: false,
  templateUrl: './filter-text.component.html',
  styleUrls: ['./filter-text.component.scss'],
})
export class FilterTextComponent extends FilterBaseComponent {
  protected override controlType = 'text' as const;
  @Input() multiline = false;
}
