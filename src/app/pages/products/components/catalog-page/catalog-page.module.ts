import { FilterValuesModule } from '../../../../shared/filtering/filter-values.module';
import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { CatalogPageComponent } from './catalog-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogActionsModule } from '../catalog-actions/catalog-actions.module';
import { AttributeBulkModule } from '../attribute-bulk/attribute-bulk.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { CatalogProductGridModule } from '../catalog-product-grid/catalog-product-grid.module';
import { CatalogProductDetailsModule } from '../product-details/product-details.module';
import { CatalogCampaignModule } from '../catalog-campaign/catalog-campaign.module';
import { MappingWorkspaceModule } from '../../../mapping/components/mapping-workspace/mapping-workspace.module';
import { MappingMoreModule } from '../../../mapping/directives/mapping-more/mapping-more.module';
import { MappingModalModule } from '../../../mapping/directives/mapping-modal/mapping-modal.module';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';

@NgModule({
  declarations: [CatalogPageComponent],
  imports: [
    FilterValuesModule,
    FormsModule,
    FilterPanelModule,
    DataTableModule,
    ReactiveFormsModule,
    RouterLink,
    CatalogActionsModule,
    AttributeBulkModule,
    IconModule,
    CatalogProductGridModule,
    CatalogProductDetailsModule,
    CatalogCampaignModule,
    MappingWorkspaceModule,
    MappingMoreModule,
    MappingModalModule,
    ModalFocusModule,
  ],
  exports: [CatalogPageComponent],
})
export class CatalogPageModule {}
