import { Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-number',
  standalone: false,
  templateUrl: './filter-number.component.html',
  styleUrls: ['./filter-number.component.scss'],
})
export class FilterNumberComponent extends FilterBaseComponent {
  get prefix(): string {
    return this.filterConfig?.extra?.['prefix'] || '';
  }

  get suffix(): string {
    return this.filterConfig?.extra?.['suffix'] || '';
  }

  // Альтернативный вариант с типизацией
  get extra(): any {
    return this.filterConfig?.extra || {};
  }
}
