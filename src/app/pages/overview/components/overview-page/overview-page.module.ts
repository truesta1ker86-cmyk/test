import { NgModule } from '@angular/core';
import { OverviewPage } from './overview-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { RouterLink } from '@angular/router';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { OverviewSalesModule } from '../overview-sales/overview-sales.module';

@NgModule({
  declarations: [OverviewPage],
  imports: [DataTableModule, RouterLink, OverviewSalesModule, IconModule],
  exports: [OverviewPage],
})
export class OverviewPageModule {}
