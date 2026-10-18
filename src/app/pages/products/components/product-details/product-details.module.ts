import { NgModule } from '@angular/core';
import { CatalogProductDetails } from './product-details.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [CatalogProductDetails],
  imports: [DataTableModule, ProductNameModule, IconModule],
  exports: [CatalogProductDetails],
})
export class CatalogProductDetailsModule {}
