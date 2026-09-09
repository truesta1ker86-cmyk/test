import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OrdersComponent } from './components/orders/orders.component';
import { OrderFilterComponent } from './components/orders/order-filter/order-filter.component';
import { OrderBulkActionsComponent } from './components/orders/order-bulk-actions/order-bulk-actions.component';
import { OrderListComponent } from './components/orders/order-list/order-list.component';
import { OrderDetailModalComponent } from './components/modals/order-detail-modal/order-detail-modal.component';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { DataTableModule } from '../../shared/data-table/data-table.module';


const routes: Routes = [
  { path: '', component: OrdersComponent }
];

@NgModule({
  declarations: [
    OrdersComponent,
    OrderFilterComponent,
    OrderBulkActionsComponent,
    OrderListComponent,
    OrderDetailModalComponent,    
  ],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    InputTextModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    TooltipModule,
    BadgeModule,
    TagModule,
    DataTableModule,
    RouterModule.forChild(routes)
  ]
})
export class OrdersModule { }