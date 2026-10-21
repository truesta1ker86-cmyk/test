import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { DataTableFilterModule } from '../../../../shared/data-table-filter/data-table-filter.module';
import { NgModule } from '@angular/core';
import { MappingWorkspace } from './mapping-workspace.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';
import { MappingModalModule } from '../../directives/mapping-modal/mapping-modal.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [MappingWorkspace],
  imports: [
    FilterPanelModule,
    DataTableModule,
    FormsModule,
    DataTableFilterModule,
    ModalFocusModule,
    MappingModalModule,
    IconModule,
    ProductNameModule,
  ],
  exports: [MappingWorkspace],
})
export class MappingWorkspaceModule {}
