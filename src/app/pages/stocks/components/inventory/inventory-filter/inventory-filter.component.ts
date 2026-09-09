import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { StockFilter } from '../../../infrastructure/models/stock.model';

@Component({
  selector: 'app-inventory-filter',
  standalone: false,
  templateUrl: './inventory-filter.component.html',
  styleUrls: ['./inventory-filter.component.scss'],
})
export class InventoryFilterComponent implements OnChanges {

  @Input() filter!: StockFilter;
  @Input() categories: { value: string; label: string }[] = [];
  @Input() types: { value: string; label: string }[] = [];
  @Input() brands: string[] = [];
  @Input() groups: string[] = [];
  @Input() series: string[] = [];
  @Input() lengths: string[] = [];
  @Input() colors: string[] = [];
  @Input() packages: string[] = [];

  @Output() filterChange = new EventEmitter<StockFilter>();

  @ViewChild('popover') popover!: ElementRef;

  search = '';
  source = '';

  popoverOpen = false;
  tempFilter: StockFilter = { ...this.filter };

  get activeFilterCount(): number {
    let count = 0;
    if (this.filter.category) count++;
    if (this.filter.type) count++;
    if (this.filter.brand) count++;
    if (this.filter.group) count++;
    if (this.filter.series) count++;
    if (this.filter.length) count++;
    if (this.filter.color) count++;
    if (this.filter.package) count++;
    return count;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter'] && this.filter) {
      this.search = this.filter.search || '';
      this.source = this.filter.source || '';
    }
  }

  applyFilter(): void {
    const updatedFilter = {
      ...this.filter,
      search: this.search,
      source: this.source as StockFilter['source'],
    };
    this.filterChange.emit(updatedFilter);
  }

  resetFilter(): void {
    this.search = '';
    this.source = '';
    this.applyFilter();
  }

  togglePopover(): void {
    this.popoverOpen = !this.popoverOpen;
    if (this.popoverOpen) {
      this.tempFilter = { ...this.filter };
    }
  }

  applyPopoverFilter(): void {

    this.filter = { ...this.tempFilter };

    this.search = this.filter.search || '';
    this.source = this.filter.source || '';

    this.filterChange.emit(this.filter);
    this.popoverOpen = false;
  }

  resetPopoverFilter(): void {
    this.tempFilter = {
      search: this.filter.search,
      source: this.filter.source,
      category: '',
      type: '',
      brand: '',
      group: '',
      series: '',
      length: '',
      color: '',
      package: '',
    };

    this.filter = { ...this.tempFilter };
    this.search = this.filter.search || '';
    this.source = this.filter.source || '';
    this.filterChange.emit(this.filter);
    this.popoverOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (this.popoverOpen && this.popover && !this.popover.nativeElement.contains(event.target)) {
      this.popoverOpen = false;
    }
  }
}