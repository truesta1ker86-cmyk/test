import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FilterService } from '../../../directives/filter-panel/infrastructure/services/filter.service';
import type {
  DataTableToolbarFilterOption,
  DataTableToolbarFilterValue,
} from '../../infrastructure/interfaces/data-table-toolbar-filter.interfaces';

@Component({
  selector: 'app-data-table-toolbar-filter',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FilterService],
  templateUrl: './data-table-toolbar-filter.component.html',
  styleUrl: './data-table-toolbar-filter.component.scss',
})
export class DataTableToolbarFilterComponent implements OnChanges {
  @Input({ required: true }) filter!: DataTableToolbarFilterValue;
  @Input() lifecycles: DataTableToolbarFilterOption[] = [];
  @Input() statuses: DataTableToolbarFilterOption[] = [];
  @Input() schemes: DataTableToolbarFilterOption[] = [];
  @Input() sorts: DataTableToolbarFilterOption[] = [];
  @Input() loading = false;
  @Input() compact = false;
  @Input() searchLabel = 'Поиск';
  @Input() searchPlaceholder = 'Номер, артикул…';
  @Output() filterChange = new EventEmitter<DataTableToolbarFilterValue>();

  lifecycle = '';
  status = '';
  scheme = '';
  search = '';
  sort = 'date_desc';

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['filter']) return;
    this.lifecycle = this.filter.lifecycle || '';
    this.status = this.filter.status || '';
    this.scheme = this.filter.scheme || '';
    this.search = this.filter.q || '';
    this.sort = this.filter.sort || this.sorts[0]?.value || 'date_desc';
  }

  applyFilter(): void {
    this.filterChange.emit({
      ...this.filter,
      lifecycle: this.lifecycles.length ? this.lifecycle : this.filter.lifecycle,
      status: this.status,
      scheme: this.scheme,
      q: this.search,
      sort: this.sort,
      page: 1,
    });
  }

  resetFilter(): void {
    this.lifecycle = this.lifecycles[0]?.value ?? this.filter.lifecycle;
    this.status = '';
    this.scheme = '';
    this.search = '';
    this.sort = this.sorts[0]?.value || 'date_desc';
    this.filterChange.emit({
      ...this.filter,
      lifecycle: this.lifecycle,
      status: '',
      scheme: '',
      q: '',
      sort: this.sort,
      column_filters: '',
      start: '',
      end: '',
      page: 1,
    });
  }
}
