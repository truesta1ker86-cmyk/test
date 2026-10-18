import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { ColumnFilterModule } from '../../../../shared/directives/filter-panel/components/column-filter/column-filter.module';
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
    ColumnFilterModule,
    CatalogCampaignModule,
    PromotionModelEditorModule,
  ],
  exports: [PromotionsPage],
})
export class PromotionsPageModule {}
