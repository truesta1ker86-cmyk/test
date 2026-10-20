import { NgModule } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { OverviewSales } from './overview-sales.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';

@NgModule({
  declarations: [OverviewSales],
  imports: [ChartModule, DataTableModule],
  exports: [OverviewSales],
})
export class OverviewSalesModule {}
