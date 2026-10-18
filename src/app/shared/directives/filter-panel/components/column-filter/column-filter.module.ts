import { NgModule } from '@angular/core';
import { ColumnFilterComponent } from './column-filter.component';
import { FilterPanelModule } from '../../filter-panel.module';
import { ModalFocusModule } from '../../../modal-focus/modal-focus.module';

@NgModule({
  declarations: [ColumnFilterComponent],
  imports: [FilterPanelModule, ModalFocusModule],
  exports: [ColumnFilterComponent],
})
export class ColumnFilterModule {}
