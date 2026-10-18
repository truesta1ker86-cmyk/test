import { NgModule } from '@angular/core';
import { ImportsPage } from './imports-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [ImportsPage],
  imports: [DataTableModule, FormsModule, ProductNameModule],
  exports: [ImportsPage],
})
export class ImportsPageModule {}
