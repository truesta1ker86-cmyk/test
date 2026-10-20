import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderListComponent } from './order-list.component';
import { DataTableModule } from '../../../../../shared/data-table/data-table.module';
import { ColumnFilterModule } from '../../../../../shared/directives/filter-panel/components/column-filter/column-filter.module';
import { RouterLink } from '@angular/router';
import { ProductNameModule } from '../../../../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../../../../shared/icons-sprite/icon/icon.module';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
@NgModule({
  declarations: [OrderListComponent],
  imports: [
    CommonModule,
    DataTableModule,
    ColumnFilterModule,
    RouterLink,
    ProductNameModule,
    CheckboxModule,
    IconModule,
    FormsModule
  ],
  exports: [OrderListComponent],
})
export class OrderListModule {}
