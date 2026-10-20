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
} from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import type { DataTableColumn } from '../../infrastructure/interfaces/data-table-config.interfaces';
import { TABLE_DATA_SERVICE } from '../../infrastructure/tokens/table-data-source.token';
import { UnsubscribeService } from '../../../services/unsubscribe.service';
import { ListPage } from '../../../../pages/orders/infrastructure/interfaces/contracts.interfaces';
import { TableDataService } from '../../infrastructure/interfaces/table-data-service';



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
  @Input() headerTemplate: TemplateRef<any> | null = null;
  @Input() dataKey = 'id';
  @Input() tableStyleClass = 'operation-table';
  @Input() tableStyle: any = { 'min-width': '100%' };
  @Input() rowClickable = true;
  @Input() emptyMessage = 'Нет данных';

  @Input() rows = 50;
  @Input() lazy = true;
  @Input() paginator = true;
  @Input() scrollable = false;
  @Input() scrollHeight = '400px';
  @Input() showCurrentPageReport = false;
  @Input() currentPageReportTemplate = '';

  // --- ИСТОЧНИК ДАННЫХ ---
  @Input() entity: string = '';
  @Input() filters: any = {};

  // --- ВЫДЕЛЕНИЕ ---
  @Input() selectionMode: 'single' | 'multiple' = 'multiple';
  @Input() selection: any[] = [];

  // --- СОРТИРОВКА ---
  @Input() sortField = '';
  @Input() sortOrder: 1 | -1 = 1;

  // --- ВЫХОДЫ ---
  @Output() pageChange = new EventEmitter<any>();
  @Output() sortChange = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() dataLoaded = new EventEmitter<ListPage>();

  @ContentChild('cellTemplate', { static: false }) cellTemplate!: TemplateRef<any>;

  // --- ВНУТРЕННЕЕ СОСТОЯНИЕ ---
  items: any[] = [];
  isLoading = false;
  totalRecords = 0;
  first = 0;

  constructor(
    @Optional() @Inject(TABLE_DATA_SERVICE) private dataService: TableDataService,
    private cdr: ChangeDetectorRef,
    private unsubscribe: UnsubscribeService
  ) {}

  ngOnInit() {
    if (this.dataService && this.entity) {
      this.loadPage(1);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.first = 0;
      this.loadPage(1);
    }
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
    this.first = event.first;
    if (event.sortField) {
      this.sortField = event.sortField;
      this.sortOrder = event.sortOrder;
      this.sortChange.emit(event);
    }
    const page = (event.first / event.rows) + 1;
    this.loadPage(page);
    this.pageChange.emit(event);
  }

  onSelectionChange(rows: any[] | any) {
    const selectedRows = Array.isArray(rows) ? rows : rows ? [rows] : [];
    this.selection = selectedRows;
    this.selectionChange.emit(selectedRows);
    this.cdr.markForCheck();
  }

  onRowClick(rowData: any): void {
    if (this.rowClickable) {
      this.rowClick.emit(rowData);
    }
  }

  loadPage(page: number) {
    if (!this.dataService || !this.entity) return;
    this.isLoading = true;
  
    const query = { ...this.filters, page, page_size: this.rows };
  
    this.dataService.listPage(this.entity, query, page, this.rows)
      .pipe(takeUntil(this.unsubscribe.destroy$))
      .subscribe({
        next: (res: ListPage) => {
          this.items = res.items || []; 
          this.totalRecords = res.meta.total;
          this.isLoading = false;
          this.dataLoaded.emit(res);
        },
        error: (err) => {
          console.error('Ошибка:', err);
          this.isLoading = false;
        },
      });
  }

  reload() {
    this.first = 0;
    this.loadPage(1);
  }
}
