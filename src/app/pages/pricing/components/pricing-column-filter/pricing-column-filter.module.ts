import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { PricingColumnFilter } from './pricing-column-filter.component';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';

@NgModule({
  declarations: [PricingColumnFilter],
  imports: [FormsModule, FilterPanelModule, ModalFocusModule],
  exports: [PricingColumnFilter],
})
export class PricingColumnFilterModule {}
