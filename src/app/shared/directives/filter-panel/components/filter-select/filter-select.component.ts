// components/filter-select/filter-select.component.ts
import { Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-select',
  standalone: false,
  templateUrl: './filter-select.component.html',
  styleUrls: ['./filter-select.component.scss']
})
export class FilterSelectComponent extends FilterBaseComponent {
  getSelectedLabel(): string {
    if (!this.filterConfig?.options) return '';
    const option = this.filterConfig.options.find(opt => opt.value === this.value);
    return option?.label || this.value || '';
  }
}