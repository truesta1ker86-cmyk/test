import { NgModule } from '@angular/core';
import { OverviewPage } from './overview-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [OverviewPage],
  imports: [DataTableModule, RouterLink],
  exports: [OverviewPage],
})
export class OverviewPageModule {}
