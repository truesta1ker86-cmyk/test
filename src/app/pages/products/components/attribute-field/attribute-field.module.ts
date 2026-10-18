import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { AttributeField } from './attribute-field.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [AttributeField],
  imports: [FormsModule, FilterPanelModule, ReactiveFormsModule],
  exports: [AttributeField],
})
export class AttributeFieldModule {}
