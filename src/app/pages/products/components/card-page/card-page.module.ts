import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../shared/directives/filter-panel/filter-panel.module';
import { NgModule } from '@angular/core';
import { CardPage } from './card-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AttributeFieldModule } from '../attribute-field/attribute-field.module';
import { AiPanelModule } from '../ai-panel/ai-panel.module';
import { GalleryModule } from '../gallery/gallery.module';
import { CatalogActionsModule } from '../catalog-actions/catalog-actions.module';
import { CardOneCModule } from '../card-onec/card-onec.module';

@NgModule({
  declarations: [CardPage],
  imports: [
    FormsModule,
    FilterPanelModule,
    DataTableModule,
    ProductNameModule,
    RouterLink,
    ReactiveFormsModule,
    AttributeFieldModule,
    AiPanelModule,
    GalleryModule,
    CatalogActionsModule,
    CardOneCModule,
  ],
  exports: [CardPage],
})
export class CardPageModule {}
