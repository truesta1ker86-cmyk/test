import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { PricingPublicationPreview } from './publication-preview.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [PricingPublicationPreview],
  imports: [FilterPanelModule, DataTableModule, ProductNameModule, FormsModule],
  exports: [PricingPublicationPreview],
})
export class PricingPublicationPreviewModule {}
