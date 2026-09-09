// filter.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterPanelDirective } from './filter-panel.directive';
import { FilterGroupDirective } from './filter-group.directive';
import { FilterControlDirective } from './filter-control.directive';
import { FilterBaseComponent } from './components/filter-base.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { FilterTextComponent } from './components/filter-text/filter-text.component';
import { FilterNumberComponent } from './components/filter-number/filter-number.component';
import { FilterSelectComponent } from './components/filter-select/filter-select.component';
import { FilterMultiselectComponent } from './components/filter-multiselect/filter-multiselect.component';
import { FilterBooleanComponent } from './components/filter-boolean/filter-boolean.component';
import { FilterSliderComponent } from './components/filter-slider/filter-slider.component';
import { FilterDateComponent } from './components/filter-date/filter-date.component';
import { FilterDaterangeComponent } from './components/filter-daterange/filter-daterange.component';
import { FilterColorComponent } from './components/filter-color/filter-color.component';



import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { SliderModule } from 'primeng/slider';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { FilterService } from './infrastructure/services/filter.service';


@NgModule({
  declarations: [
    // Директивы
    FilterPanelDirective,
    FilterGroupDirective,
    FilterControlDirective,
    
    // Базовый компонент
    FilterBaseComponent,
    
    // Компоненты
    FilterPanelComponent,
    FilterTextComponent,
    FilterNumberComponent,
    FilterSelectComponent,
    FilterMultiselectComponent,
    FilterBooleanComponent,
    FilterSliderComponent,
    FilterDateComponent,
    FilterDaterangeComponent,
    FilterColorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    
    // PrimeNG
    InputTextModule,
    InputNumberModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    SliderModule,
    ToggleButtonModule,
    ColorPickerModule,
    ButtonModule,
    BadgeModule,
    TooltipModule
  ],
  exports: [
    // Директивы
    FilterPanelDirective,
    FilterGroupDirective,
    FilterControlDirective,
    
    // Компоненты
    FilterPanelComponent,
    FilterTextComponent,
    FilterNumberComponent,
    FilterSelectComponent,
    FilterMultiselectComponent,
    FilterBooleanComponent,
    FilterSliderComponent,
    FilterDateComponent,
    FilterDaterangeComponent,
    FilterColorComponent,
  ],
  providers: [
    FilterService
  ]
})
export class FilterPanelModule { }