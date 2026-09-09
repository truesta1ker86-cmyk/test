import { Component, Input } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-boolean',
  standalone: false,
  templateUrl: './filter-boolean.component.html',
  styleUrls: ['./filter-boolean.component.scss'],
})
export class FilterBooleanComponent extends FilterBaseComponent {
  @Input() onLabel: string = 'Да';
  @Input() offLabel: string = 'Нет';
  @Input() onIcon: string = 'pi pi-check';
  @Input() offIcon: string = 'pi pi-times';
}
