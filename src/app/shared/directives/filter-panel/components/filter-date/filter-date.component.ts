// components/filter-date/filter-date.component.ts
import { Component, Input } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-date',
  standalone: false,
  templateUrl: './filter-date.component.html',
  styleUrls: ['./filter-date.component.scss'],
})
export class FilterDateComponent extends FilterBaseComponent {
  @Input() dateFormat: string = 'yy-mm-dd';
  @Input() showTime: boolean = false;
  @Input() hourFormat: '12' | '24' = '24';
  @Input() showIcon: boolean = true;
  @Input() showButtonBar: boolean = true;


  public get minDate(): Date | null {
    const extra = this.filterConfig?.extra;
    if (!extra) return null;

    const value = extra['minDate'];
    if (!value) return null;

    // Если уже Date - возвращаем как есть
    if (value instanceof Date) return value;

    // Если строка - конвертируем
    if (typeof value === 'string') {
      const date = new Date(value);
      // Проверяем, что дата валидна
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  public get maxDate(): Date | null {
    const extra = this.filterConfig?.extra;
    if (!extra) return null;

    const value = extra['maxDate'];
    if (!value) return null;

    // Если уже Date - возвращаем как есть
    if (value instanceof Date) return value;

    // Если строка - конвертируем
    if (typeof value === 'string') {
      const date = new Date(value);
      // Проверяем, что дата валидна
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  public get hasMinDate(): boolean {
    return !!this.filterConfig?.extra?.['minDate'];
  }

  public get hasMaxDate(): boolean {
    return !!this.filterConfig?.extra?.['maxDate'];
  }

  public get locale(): string {
    return this.getExtraString('locale', 'ru');
  }

  public get showTimePicker(): boolean {
    return this.showTime || this.getExtraBoolean('showTime', false);
  }

  public get timeFormat(): '12' | '24' {
    return this.getExtraString('hourFormat', this.hourFormat) as '12' | '24';
  }

  private getExtraBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.getExtraValue<boolean>(key);
    return value !== undefined ? value : defaultValue;
  }

}
