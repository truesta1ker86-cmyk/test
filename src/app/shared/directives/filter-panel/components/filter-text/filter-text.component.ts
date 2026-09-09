import { Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-text',
  standalone: false,
  templateUrl: './filter-text.component.html',
  styleUrls: ['./filter-text.component.scss']
})
export class FilterTextComponent extends FilterBaseComponent {}