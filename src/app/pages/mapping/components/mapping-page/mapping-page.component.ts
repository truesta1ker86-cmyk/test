import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { CatalogPageComponent } from '../../../products/components/catalog-page/catalog-page.component';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-mapping-page',

  templateUrl: './mapping-page.component.html',
  styleUrl: './mapping-page.component.css',
})
export class MappingPage extends CatalogPageComponent {
  mappingHistory() {
    return this.history().filter((op) => op.kind === 'mapping');
  }
  mappingHistoryColumns(): DataTableColumn[] {
    return [
      { field: 'column_1', header: 'Дата', cellTemplate: { slot: 'cell1' } },
      { field: 'column_2', header: 'Статус', cellTemplate: { slot: 'cell2' } },
      { field: 'column_3', header: 'Товаров', cellTemplate: { slot: 'cell3' } },
      { field: 'column_4', header: 'Действие', cellTemplate: { slot: 'cell4' } },
    ];
  }

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

  override mappingStatusOptions() {
    return [
      { value: '', label: 'Все товары' },
      { value: 'matched', label: 'Сопоставленные' },
      { value: 'unmatched', label: 'Не сопоставленные' },
      ...['verified', 'not_seen', 'suggested', 'conflict', 'unmapped'].flatMap((key) => [
        { value: String(key), label: String(key === 'verified' ? 'Проверены' : this.labels[key]) },
      ]),
    ];
  }
  override mappingReasonOptions() {
    return [
      { value: '', label: 'Все причины' },
      ...this.reasonKeys.flatMap((key) => [
        { value: String(key), label: String(this.reasons[key]) },
      ]),
    ];
  }
}
