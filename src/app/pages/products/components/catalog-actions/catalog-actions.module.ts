import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { CatalogActions } from './catalog-actions.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [CatalogActions],
  imports: [
    FormsModule,
    FilterPanelModule,
    DataTableModule,
    ProductNameModule,
    ReactiveFormsModule,
  ],
  exports: [CatalogActions],
})
export class CatalogActionsModule {}
