import { NgModule } from '@angular/core';
import { DataTableFilterModule } from '../../../../shared/data-table-filter/data-table-filter.module';
import { PricingColumnFilter } from './pricing-column-filter.component';
@NgModule({
  declarations: [PricingColumnFilter],
  imports: [DataTableFilterModule],
  exports: [PricingColumnFilter],
})
export class PricingColumnFilterModule {}
