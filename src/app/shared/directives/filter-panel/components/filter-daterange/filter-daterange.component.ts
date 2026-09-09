import { Component, Input } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-daterange',
  standalone: false,
  templateUrl: './filter-daterange.component.html',
  styleUrls: ['./filter-daterange.component.scss'],
})
export class FilterDaterangeComponent extends FilterBaseComponent {
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
