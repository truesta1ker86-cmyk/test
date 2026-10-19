import { NgModule } from '@angular/core';
import { TableFiltersComponent } from './table-filters.component';
import { IconModule } from '../icons-sprite/icon/icon.module';
import { ModalFocusModule } from '../directives/modal-focus/modal-focus.module';

@NgModule({
  declarations: [TableFiltersComponent],
  imports: [IconModule, ModalFocusModule],
  exports: [TableFiltersComponent],
})
export class TableFiltersModule {}
