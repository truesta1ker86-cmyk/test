import { NgModule } from '@angular/core';
import { StockRunPanel } from './stock-run-preview.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { StockPagerModule } from '../stock-pager/stock-pager.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [StockRunPanel],
  imports: [DataTableModule, StockPagerModule, ProductNameModule],
  exports: [StockRunPanel],
})
export class StockRunPanelModule {}
