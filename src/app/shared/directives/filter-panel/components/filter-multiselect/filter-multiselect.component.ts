// components/filter-multiselect/filter-multiselect.component.ts
import { Component } from '@angular/core';
import { FilterBaseComponent } from '../filter-base.component';

@Component({
  selector: 'app-filter-multiselect',
  standalone: false,
  templateUrl: './filter-multiselect.component.html',
  styleUrls: ['./filter-multiselect.component.scss'],
})
export class FilterMultiselectComponent extends FilterBaseComponent {}
