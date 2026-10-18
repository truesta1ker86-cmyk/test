import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { forwardRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FilterBaseComponent } from '../filter-base/filter-base.component';

@Component({
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterDaterangeComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-filter-daterange',
  standalone: false,
  templateUrl: './filter-daterange.component.html',
  styleUrls: ['./filter-daterange.component.scss'],
})
export class FilterDaterangeComponent extends FilterBaseComponent {
  protected override controlType = 'daterange' as const;
  @Input() dateFormat: string = 'yy-mm-dd';

  public valueFrom: any = null;
  public valueTo: any = null;

  // Переопределяем эффект для работы с диапазоном
  public override ngOnInit() {
    super.ngOnInit();

    // Инициализируем значения из текущего состояния
    if (this.value && typeof this.value === 'object') {
      this.valueFrom = this.value.from || null;
      this.valueTo = this.value.to || null;
    }
  }

  updateDateRange(): void {
    const range = {
      from: this.valueFrom || '',
      to: this.valueTo || '',
    };
    this.updateValue(range);
  }
}
