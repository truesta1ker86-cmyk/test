import { Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-slider',
  standalone: false,
  templateUrl: './filter-slider.component.html',
  styleUrls: ['./filter-slider.component.scss'],
})
export class FilterSliderComponent extends FilterBaseComponent {
  public get displayValue(): string {
    return this.value !== null && this.value !== undefined ? String(this.value) : '0';
  }
}
