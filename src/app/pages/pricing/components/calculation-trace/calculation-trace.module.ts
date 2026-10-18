import { NgModule } from '@angular/core';
import { PricingCalculationTrace } from './calculation-trace.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';

@NgModule({
  declarations: [PricingCalculationTrace],
  imports: [DataTableModule],
  exports: [PricingCalculationTrace],
})
export class PricingCalculationTraceModule {}
