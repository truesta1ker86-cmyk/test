import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { AttributeBulk } from './attribute-bulk.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { ReactiveFormsModule } from '@angular/forms';
import { AttributeFieldModule } from '../attribute-field/attribute-field.module';

@NgModule({
  declarations: [AttributeBulk],
  imports: [
    FormsModule,
    FilterPanelModule,
    DataTableModule,
    ProductNameModule,
    ReactiveFormsModule,
    AttributeFieldModule,
  ],
  exports: [AttributeBulk],
})
export class AttributeBulkModule {}
