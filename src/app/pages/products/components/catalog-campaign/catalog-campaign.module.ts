import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { ColumnFilterModule } from '../../../../shared/directives/filter-panel/components/column-filter/column-filter.module';
import { NgModule } from '@angular/core';
import { CatalogCampaign } from './catalog-campaign.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [CatalogCampaign],
  imports: [
    FilterPanelModule,
    DataTableModule,
    FormsModule,
    ProductNameModule,
    IconModule,
    ColumnFilterModule,
  ],
  exports: [CatalogCampaign],
})
export class CatalogCampaignModule {}
