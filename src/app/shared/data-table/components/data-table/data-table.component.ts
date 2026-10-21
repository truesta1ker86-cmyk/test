import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  Optional,
  Inject,
  ChangeDetectorRef,
  signal,
} from '@angular/core';
import { Subscription, takeUntil } from 'rxjs';
import type { DataTableColumn } from '../../infrastructure/interfaces/data-table-config.interfaces';
import { TABLE_DATA_SERVICE } from '../../infrastructure/tokens/table-data-source.token';
import { TableDataService, TablePage } from '../../infrastructure/interfaces/table-data-service';
import { UnsubscribeService } from '../../../infrastructure/services/unsubscribe.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-data-table',
  standalone: false,
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  providers: [UnsubscribeService],
})
export class DataTableComponent implements OnInit, OnChanges {
  // --- INPUTS ---
  @Input() columns: DataTableColumn[] = [];
  @Input() columnRules: Record<string, DataTableFilterRule> = {};
  @Input() columnOptions: Record<string, string[]> = {};
  @Input() columnCounts: Record<string, Record<string, number>> = {};
  @Output() columnChanged = new EventEmitter<DataTableFilterChange>();
  @Input() headerTemplate: TemplateRef<any> | null = null;
  @Input() data: any[] = [];
  @Input() loading = false;
  @Input() dataKey = 'id';
  @Input() tableStyleClass = 'operation-table';
  @Input() tableStyle: any = { 'min-width': '100%' };
  @Input() rowClickable = true;
  @Input() emptyMessage = 'Нет данных';

  @Input() rows = 50;
  @Input() lazy = true;
  @Input() paginator: boolean | undefined;
  @Input() scrollable = false;
  @Input() scrollHeight = '400px';
  @Input() showCurrentPageReport = true;
  @Input() currentPageReportTemplate = '{first}–{last} из {totalRecords}';

  // --- ИСТОЧНИК ДАННЫХ ---
  @Input() entity: string = '';
  @Input() filters: any = {};
  @Input() refreshToken: unknown;

  // --- ВЫДЕЛЕНИЕ ---
  @Input() selectionMode: 'single' | 'multiple' | 'none' = 'multiple';
  @Input() selection: any[] = [];

  // --- СОРТИРОВКА ---
  @Input() sortField = '';
  @Input() sortOrder: 1 | -1 = 1;

  // --- ВЫХОДЫ ---
  @Output() pageChange = new EventEmitter<any>();
  @Output() sortChange = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() dataLoaded = new EventEmitter<TablePage>();
  @Output() dataError = new EventEmitter<unknown>();

  @ContentChild('cellTemplate', { static: false }) cellTemplate!: TemplateRef<any>;

  // --- ВНУТРЕННЕЕ СОСТОЯНИЕ ---
  items: any[] = [];
  readonly isLoading = signal(false);
  private suppliedTotal: number | undefined;
  private loadedTotal = 0;
  @Input() set totalRecords(value: number) {
    this.suppliedTotal = value;
  }
  get totalRecords(): number {
    return this.remote ? this.loadedTotal : (this.suppliedTotal ?? this.items.length);
  }
  @Input() first = 0;
  error = '';
  private request?: Subscription;
  private initialized = false;
  private requestKey = '';
  private lastPage?: TablePage;

  get remote(): boolean {
    return !!this.dataService && !!this.entity;
  }
  get selectionCheckboxes(): boolean {
    return (
      this.selectionMode === 'multiple' &&
      !this.columns.some((column) => column.field === 'selection')
    );
  }

  constructor(
    @Optional() @Inject(TABLE_DATA_SERVICE) private dataService: TableDataService,
    private cdr: ChangeDetectorRef,
    private unsubscribe: UnsubscribeService,
  ) {}

  ngOnInit() {
    this.initialized = true;
    if (this.remote && !this.lazy) this.loadPage(1);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) this.items = this.data;
    if (!this.remote) {
      this.request?.unsubscribe();
      this.requestKey = '';
      this.lastPage = undefined;
      this.items = this.data;
      return;
    }
    if (changes['entity'] || changes['filters']) {
      this.rows = Number(this.filters.page_size) || this.rows;
      const page = Math.max(1, Number(this.filters.page) || 1);
      this.first = (page - 1) * this.rows;
      if (this.initialized) this.loadPage(page);
    }
    if (this.initialized && changes['refreshToken']) this.reload();
  }

  trackColumn(index: number, column: DataTableColumn): string {
    return `${column.field}:${index}`;
  }

  getValue(row: any, field: string): any {
    return row[field];
  }

  hasCellTemplate(column: DataTableColumn): boolean {
    return !!this.cellTemplate && column.cellTemplate !== undefined;
  }

  onLazyLoad(event: any) {
    this.first = event.first || 0;
    this.rows = event.rows || this.rows;
    if (event.sortField) {
      this.sortField = event.sortField;
      this.sortOrder = event.sortOrder;
      this.sortChange.emit(event);
    }
    const page = Math.floor(this.first / this.rows) + 1;
    this.loadPage(page);
    this.pageChange.emit(event);
  }

  onSelectionChange(event: any): void {
    if (this.selectionMode === 'none') return;
    const selectedRows = Array.isArray(event) ? event : event ? [event] : [];
    this.selection = selectedRows;
    this.selectionChange.emit(selectedRows);
    this.cdr.markForCheck();
  }

  onPage(event: any): void {
    this.pageChange.emit(event);
  }
  onSort(event: any): void {
    this.sortChange.emit(event);
  }

  onRowClick(rowData: any): void {
    if (this.rowClickable) {
      this.rowClick.emit(rowData);
    }
  }

  loadPage(page: number, force = false) {
    if (!this.remote) return;
    const query = { ...this.filters, page, page_size: this.rows };
    const key = JSON.stringify([this.entity, query]);
    if (!force && this.requestKey === key) {
      if (!this.isLoading() && this.lastPage) this.dataLoaded.emit(this.lastPage);
      return;
    }
    this.requestKey = key;
    this.lastPage = undefined;
    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.error = '';
    this.cdr.markForCheck();

    this.request = this.dataService
      .listPage(this.entity, query, page, this.rows)
      .pipe(takeUntil(this.unsubscribe.destroy$))
      .subscribe({
        next: (res) => {
          this.lastPage = res;
          this.items = res.items || [];
          this.loadedTotal = res.meta.total;
          this.isLoading.set(false);
          this.dataLoaded.emit(res);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.items = [];
          this.loadedTotal = 0;
          this.isLoading.set(false);
          this.error = 'Не удалось загрузить таблицу. Повторите запрос.';
          this.requestKey = '';
          this.dataError.emit(err);
          this.cdr.markForCheck();
        },
      });
  }

  reload() {
    this.loadPage(Math.floor(this.first / this.rows) + 1, true);
  }
}
import type {
  DataTableFilterRule,
  DataTableFilterChange,
} from '../../../data-table-filter/infrastructure/interfaces/data-table-filter.interfaces';
