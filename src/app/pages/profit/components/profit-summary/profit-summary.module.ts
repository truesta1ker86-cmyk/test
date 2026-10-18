import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { ColumnFilterModule } from '../../../../shared/directives/filter-panel/components/column-filter/column-filter.module';
import { NgModule } from '@angular/core';
import { ProfitSummary } from './profit-summary.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [ProfitSummary],
  imports: [FilterPanelModule, DataTableModule, FormsModule, ColumnFilterModule, ProductNameModule],
  exports: [ProfitSummary],
})
export class ProfitSummaryModule {}
