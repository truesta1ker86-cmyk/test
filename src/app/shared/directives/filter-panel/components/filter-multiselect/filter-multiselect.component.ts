import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
} from '@angular/core';
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
  @Input() appendTo: HTMLElement | 'body' | undefined;
  @Input() inline = false;
  @Input() optionTemplate: TemplateRef<unknown> | null = null;
  @Input() listSearchPlaceholder = 'Найти значение…';
  protected override controlType = 'multiselect' as const;
  @Output() filterChanged = new EventEmitter<string>();
}
