import { InventoryDetailModule } from '../inventory/inventory-detail/inventory-detail.module';
import { InventoryReconciliationModule } from '../inventory/inventory-reconciliation/inventory-reconciliation.module';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { StocksPage } from './stocks-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';
import { AllocationMatrixModule } from '../allocation/allocation-matrix/allocation-matrix.module';
import { InventoryFilterModule } from '../inventory/inventory-filter/inventory-filter.module';
import { AnimatedCountModule } from '../../../../shared/ui/animated-count/components/animated-count/animated-count.module';
import { StockPagerModule } from '../stock-pager/stock-pager.module';
import { StockRunPanelModule } from '../stock-run-preview/stock-run-preview.module';

@NgModule({
  declarations: [StocksPage],
  imports: [
    InventoryDetailModule,
    InventoryReconciliationModule,
    FilterPanelModule,
    DataTableModule,
    ProductNameModule,
    FormsModule,
    RouterLink,
    ModalFocusModule,
    AllocationMatrixModule,
    InventoryFilterModule,
    AnimatedCountModule,
    StockPagerModule,
    StockRunPanelModule,
  ],
  exports: [StocksPage],
})
export class StocksPageModule {}
