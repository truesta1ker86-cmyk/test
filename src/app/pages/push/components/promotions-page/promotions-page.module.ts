import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { DataTableFilterModule } from '../../../../shared/data-table-filter/data-table-filter.module';
import { NgModule } from '@angular/core';
import { PromotionsPage } from './promotions-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { CatalogCampaignModule } from '../../../products/components/catalog-campaign/catalog-campaign.module';
import { PromotionModelEditorModule } from '../model-editor/model-editor.module';

@NgModule({
  declarations: [PromotionsPage],
  imports: [
    FilterPanelModule,
    DataTableModule,
    FormsModule,
    RouterLink,
    ProductNameModule,
    IconModule,
    DataTableFilterModule,
    CatalogCampaignModule,
    PromotionModelEditorModule,
  ],
  exports: [PromotionsPage],
})
export class PromotionsPageModule {}
