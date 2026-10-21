import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { DataTableFilterModule } from '../../../../shared/data-table-filter/data-table-filter.module';
import { NgModule } from '@angular/core';
import { ProfitSummary } from './profit-summary.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [ProfitSummary],
  imports: [
    FilterPanelModule,
    DataTableModule,
    FormsModule,
    DataTableFilterModule,
    ProductNameModule,
  ],
  exports: [ProfitSummary],
})
export class ProfitSummaryModule {}
