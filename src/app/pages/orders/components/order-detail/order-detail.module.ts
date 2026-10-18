import { NgModule } from '@angular/core';
import { OrderDetails } from './order-detail.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { RouterLink } from '@angular/router';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [OrderDetails],
  imports: [DataTableModule, ProductNameModule, RouterLink, IconModule],
  exports: [OrderDetails],
})
export class OrderDetailsModule {}
