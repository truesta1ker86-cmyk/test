import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OrdersComponent } from './components/orders/orders.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { OrderListComponent } from './components/orders/order-list/order-list.component';
import { OrderBulkActionsComponent } from './components/orders/order-bulk-actions/order-bulk-actions.component';
import { OrderDetails } from './components/order-detail/order-detail.component';
import { DataTableModule } from '../../shared/data-table/data-table.module';
import { DataTableFilterModule } from '../../shared/data-table-filter/data-table-filter.module';
import { ProductNameModule } from '../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../shared/icons-sprite/icon/icon.module';

export const routes: Routes = [
  { path: '', component: OrdersComponent, title: 'Заказы — Ozon × 1С' },
];

@NgModule({
  declarations: [OrdersComponent, OrderListComponent, OrderBulkActionsComponent, OrderDetails],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    CheckboxModule,
    DataTableModule,
    DataTableFilterModule,
    ProductNameModule,
    IconModule,
  ],
})
export class OrdersModule {}
