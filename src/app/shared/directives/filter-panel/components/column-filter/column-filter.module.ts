import { PreloaderIndicatorModule } from '../../../../preloader/preloader-indicator.module';
import { NgModule } from '@angular/core';
import { ColumnFilterComponent } from './column-filter.component';
import { FilterPanelModule } from '../../filter-panel.module';
import { ModalFocusModule } from '../../../modal-focus/modal-focus.module';

@NgModule({
  declarations: [ColumnFilterComponent],
  imports: [FilterPanelModule, ModalFocusModule, PreloaderIndicatorModule],
  exports: [ColumnFilterComponent],
})
export class ColumnFilterModule {}
