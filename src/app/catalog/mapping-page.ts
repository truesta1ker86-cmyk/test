import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CatalogPageComponent } from './catalog-page';
import { MappingConnection } from './mapping-connection';
import { MappingWorkspace } from './mapping-workspace';
import { MappingMore } from './mapping-more';
import { MappingModal } from './mapping-modal';
import { ModalFocus } from '../shared/modal-focus';
import { StockChoiceFilter } from '../stocks/stock-choice';
import { Icon } from '../shared/icon';
import { CatalogProductDetails } from './product-details';

/** The v1 mapping screen has its own layout; catalog query and operation logic is shared. */
@Component({
  selector: 'app-mapping-page',
  imports: [
    ReactiveFormsModule,
    MappingConnection,
    MappingWorkspace,
    MappingMore,
    MappingModal,
    ModalFocus,
    StockChoiceFilter,
    Icon,
    CatalogProductDetails,
  ],
  templateUrl: './mapping-page.html',
  styleUrl: './mapping-page.css',
})
export class MappingPage extends CatalogPageComponent {
  readonly filtersOpen = signal(false);
  readonly mappingFacets = this.fields.filter((f) => ['category', 'type', 'brand'].includes(f.key));
  group() {
    const status = this.query().mapping_status;
    return status === 'matched' || status === 'verified' ? 'matched' : status ? 'unmatched' : '';
  }
  applyMappingFilters() {
    if (this.form.controls['mapping_reason'].value)
      this.form.controls['mapping_status'].setValue('unmatched');
    this.clearRules();
    this.applyFilters();
    this.filtersOpen.set(false);
  }
  resetMappingFilters() {
    this.reset();
    this.filtersOpen.set(false);
  }
}
