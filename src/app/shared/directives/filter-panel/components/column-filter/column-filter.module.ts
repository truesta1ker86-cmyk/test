import { NgModule } from '@angular/core';
import { ColumnFilterComponent } from './column-filter.component';
import { FilterPanelModule } from '../../filter-panel.module';
import { ModalFocusModule } from '../../../modal-focus/modal-focus.module';
import { IconModule } from '../../../../icons-sprite/icon/icon.module';

@NgModule({
  declarations: [ColumnFilterComponent],
  imports: [FilterPanelModule, ModalFocusModule, IconModule],
  exports: [ColumnFilterComponent],
})
export class ColumnFilterModule {}
