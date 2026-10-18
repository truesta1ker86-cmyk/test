import { NgModule } from '@angular/core';
import { PricingGrid } from './pricing-grid.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { PricingColumnFilterModule } from '../pricing-column-filter/pricing-column-filter.module';
import { PricingWorkingCellModule } from '../working-cell/working-cell.module';

@NgModule({
  declarations: [PricingGrid],
  imports: [DataTableModule, FormsModule, PricingColumnFilterModule, PricingWorkingCellModule],
  exports: [PricingGrid],
})
export class PricingGridModule {}
