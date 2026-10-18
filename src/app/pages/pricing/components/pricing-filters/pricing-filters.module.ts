import { FilterValuesModule } from '../../../../shared/filtering/filter-values.module';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { PricingFilters } from './pricing-filters.component';
import { FormsModule } from '@angular/forms';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [PricingFilters],
  imports: [FilterValuesModule, FilterPanelModule, FormsModule, ModalFocusModule, IconModule],
  exports: [PricingFilters],
})
export class PricingFiltersModule {}
