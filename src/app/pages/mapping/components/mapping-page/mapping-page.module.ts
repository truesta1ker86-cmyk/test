import { FilterValuesModule } from '../../../../shared/filtering/filter-values.module';
import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { MappingPage } from './mapping-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ReactiveFormsModule } from '@angular/forms';
import { MappingConnectionModule } from '../mapping-connection/mapping-connection.module';
import { MappingWorkspaceModule } from '../mapping-workspace/mapping-workspace.module';
import { MappingMoreModule } from '../../directives/mapping-more/mapping-more.module';
import { MappingModalModule } from '../../directives/mapping-modal/mapping-modal.module';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { CatalogProductDetailsModule } from '../../../products/components/product-details/product-details.module';

@NgModule({
  declarations: [MappingPage],
  imports: [
    FilterValuesModule,
    FormsModule,
    FilterPanelModule,
    DataTableModule,
    ReactiveFormsModule,
    MappingConnectionModule,
    MappingWorkspaceModule,
    MappingMoreModule,
    MappingModalModule,
    ModalFocusModule,
    IconModule,
    CatalogProductDetailsModule,
  ],
  exports: [MappingPage],
})
export class MappingPageModule {}
