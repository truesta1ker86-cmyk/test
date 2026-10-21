import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterPanelModule } from '../directives/filter-panel/filter-panel.module';
import { ModalFocusModule } from '../directives/modal-focus/modal-focus.module';
import { PreloaderIndicatorModule } from '../preloader/preloader-indicator.module';
import { DataTableFilterComponent } from './components/data-table-filter/data-table-filter.component';

@NgModule({
  declarations: [DataTableFilterComponent],
  imports: [CommonModule, FilterPanelModule, ModalFocusModule, PreloaderIndicatorModule],
  exports: [DataTableFilterComponent],
})
export class DataTableFilterModule {}
