import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { StockFilter } from '../../../infrastructure/models/stock.model';



@Component({
  selector: 'app-allocation-filter',
  standalone: false,
  templateUrl: './allocation-filter.component.html',
  styleUrls: ['./allocation-filter.component.scss'],
})
export class AllocationFilterComponent implements OnChanges {
  @Input() filter!: StockFilter;
  @Input() categories: { value: string; label: string }[] = [];
  @Input() types: { value: string; label: string }[] = [];
  @Input() brands: string[] = [];
  @Input() groups: string[] = [];
  @Input() series: string[] = [];
  @Input() lengths: string[] = [];
  @Input() colors: string[] = [];
  @Input() packages: string[] = [];

  @Output() facetChange = new EventEmitter<{ field: string; value: string }>();
  @Output() filterChange = new EventEmitter<StockFilter>();

  tempFilter: StockFilter = { ...this.filter };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter'] && this.filter) {
      this.tempFilter = { ...this.filter };
    }
  }

  onFieldChange(field: string, value: string): void {
    (this.tempFilter as any)[field] = value;
    this.facetChange.emit({ field, value });
  }

  applyFilter(): void {
    this.filterChange.emit(this.tempFilter);
  }

  resetFilter(): void {
    this.tempFilter = {
      search: this.filter.search || '',
      source: this.filter.source || '',
      category: '',
      type: '',
      brand: '',
      group: '',
      series: '',
      length: '',
      color: '',
      package: '',
    };
    const FACET_ORDER = [
      'category',
      'type',
      'group',
      'brand',
      'series',
      'length',
      'color',
      'package',
    ];
    FACET_ORDER.forEach((field) => {
      this.facetChange.emit({ field, value: '' });
    });
    this.applyFilter();
  }
}
