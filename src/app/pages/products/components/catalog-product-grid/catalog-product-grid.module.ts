import { ColumnFilterModule } from '../../../../shared/directives/filter-panel/components/column-filter/column-filter.module';
import { NgModule } from '@angular/core';
import { CatalogProductGrid } from './catalog-product-grid.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [CatalogProductGrid],
  imports: [DataTableModule, RouterLink, ColumnFilterModule],
  exports: [CatalogProductGrid],
})
export class CatalogProductGridModule {}
