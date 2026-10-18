import { PopupButtonModule } from '../../../../../shared/popup-button/popup-button.module';
import { FilterPanelModule } from '../../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { InventoryFilterComponent } from './inventory-filter.component';
import { FormsModule } from '@angular/forms';
import { ModalFocusModule } from '../../../../../shared/directives/modal-focus/modal-focus.module';
import { IconModule } from '../../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [InventoryFilterComponent],
  imports: [PopupButtonModule, FilterPanelModule, FormsModule, ModalFocusModule, IconModule],
  exports: [InventoryFilterComponent],
})
export class InventoryFilterModule {}
