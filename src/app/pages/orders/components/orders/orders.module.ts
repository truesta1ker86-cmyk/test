import { OrderBulkActionsModule } from '../orders/order-bulk-actions/order-bulk-actions.module';
import { OrderListModule } from '../orders/order-list/order-list.module';
import { OrderFilterModule } from '../orders/order-filter/order-filter.module';
import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { DataTableFilterModule } from '../../../../shared/data-table-filter/data-table-filter.module';
import { NgModule } from '@angular/core';
import { OrdersComponent } from './orders.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { OrderDetailsModule } from '../order-detail/order-detail.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [OrdersComponent],
  imports: [
    OrderBulkActionsModule,
    OrderListModule,
    OrderFilterModule,
    FormsModule,
    FilterPanelModule,
    DataTableModule,
    RouterLink,
    ReactiveFormsModule,
    OrderDetailsModule,
    ProductNameModule,
    IconModule,
    DataTableFilterModule,
  ],
  exports: [OrdersComponent],
})
export class OrdersPageModule {}
