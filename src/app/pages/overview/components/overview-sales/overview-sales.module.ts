import { NgModule } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { OverviewSales } from './overview-sales.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [OverviewSales],
  imports: [ChartModule, DataTableModule, FormsModule],
  exports: [OverviewSales],
})
export class OverviewSalesModule {}
