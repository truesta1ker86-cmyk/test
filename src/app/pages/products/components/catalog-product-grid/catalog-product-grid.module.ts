import { DataTableFilterModule } from '../../../../shared/data-table-filter/data-table-filter.module';
import { NgModule } from '@angular/core';
import { CatalogProductGrid } from './catalog-product-grid.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [CatalogProductGrid],
  imports: [DataTableModule, RouterLink, DataTableFilterModule],
  exports: [CatalogProductGrid],
})
export class CatalogProductGridModule {}
