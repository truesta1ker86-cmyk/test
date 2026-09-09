import { Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-color',
  standalone: false,
  templateUrl: './filter-color.component.html',
  styleUrls: ['./filter-color.component.scss'],
})
export class FilterColorComponent extends FilterBaseComponent {}
