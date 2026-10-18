import { NgModule } from '@angular/core';
import { ProductDetails } from './product-details.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { PricingCalculationTraceModule } from '../calculation-trace/calculation-trace.module';

@NgModule({
  declarations: [ProductDetails],
  imports: [DataTableModule, ProductNameModule, IconModule, PricingCalculationTraceModule],
  exports: [ProductDetails],
})
export class ProductDetailsModule {}
