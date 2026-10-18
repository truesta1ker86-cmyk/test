import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { WarehousePickerComponent } from './warehouse-picker.component';
import { ModalFocusModule } from '../../../../../shared/directives/modal-focus/modal-focus.module';

@NgModule({
  declarations: [WarehousePickerComponent],
  imports: [FormsModule, FilterPanelModule, ModalFocusModule],
  exports: [WarehousePickerComponent],
})
export class WarehousePickerModule {}
