import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { PricingPageComponent } from './pricing-page.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductDetailsModule } from '../product-details/product-details.module';
import { PriceEditorModule } from '../price-editor/price-editor.module';
import { BulkEditorModule } from '../bulk-editor/bulk-editor.module';
import { MarginRulesModule } from '../margin-rules/margin-rules.module';
import { PricingFiltersModule } from '../pricing-filters/pricing-filters.module';
import { PricingGridModule } from '../pricing-grid/pricing-grid.module';
import { PricingPublicationPreviewModule } from '../publication-preview/publication-preview.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [PricingPageComponent],
  imports: [
    FilterPanelModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    ProductDetailsModule,
    PriceEditorModule,
    BulkEditorModule,
    MarginRulesModule,
    PricingFiltersModule,
    PricingGridModule,
    PricingPublicationPreviewModule,
    IconModule,
  ],
  exports: [PricingPageComponent],
})
export class PricingPageModule {}
