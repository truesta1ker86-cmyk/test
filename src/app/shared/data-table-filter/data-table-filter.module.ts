import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../directives/filter-panel/filter-panel.module';
import { ModalFocusModule } from '../directives/modal-focus/modal-focus.module';
import { PreloaderIndicatorModule } from '../preloader/preloader-indicator.module';
import { DataTableFilterComponent } from './components/data-table-filter/data-table-filter.component';
import { DataTableToolbarFilterComponent } from './components/data-table-toolbar-filter/data-table-toolbar-filter.component';

@NgModule({
  declarations: [DataTableFilterComponent, DataTableToolbarFilterComponent],
  imports: [
    CommonModule,
    FormsModule,
    FilterPanelModule,
    ModalFocusModule,
    PreloaderIndicatorModule,
  ],
  exports: [DataTableFilterComponent, DataTableToolbarFilterComponent],
})
export class DataTableFilterModule {}
