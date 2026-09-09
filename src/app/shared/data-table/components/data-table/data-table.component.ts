import {
    Component,
    Input,
    Output,
    EventEmitter,
    ContentChild,
    TemplateRef,
    forwardRef,
  } from '@angular/core';
  import { DataTableColumn } from './models/data-table-config.model';
  
  @Component({
    selector: 'app-data-table',
    standalone: false,
    templateUrl: './data-table.component.html',
    styleUrls: ['./data-table.component.scss'],
  })
  export class DataTableComponent {
    @Input() columns: DataTableColumn[] = [];
    @Input() headerTemplate: TemplateRef<any> | null = null;
    @Input() data: any[] = [];
    @Input() totalRecords = 0;
    @Input() loading = false;
    @Input() rows = 50;
    @Input() first = 0;
    @Input() selection: any[] = [];
    @Input() selectionMode: 'single' | 'multiple' | 'none' = 'multiple';
    @Input() lazy = true;
    @Input() sortField = '';
    @Input() sortOrder: 1 | -1 = 1;
    @Input() scrollable = true;
    @Input() scrollHeight = '400px';
    @Input() tableStyle: any = { 'min-width': '100%' };
    @Input() showCurrentPageReport = true;
    @Input() currentPageReportTemplate = 'Показано {first}–{last} из {totalRecords}';
    @Input() rowClickable = true; // клик по строке разрешён
    @Input() emptyMessage = 'Нет данных';
  
    @Output() pageChange = new EventEmitter<any>();
    @Output() sortChange = new EventEmitter<any>();
    @Output() selectionChange = new EventEmitter<any[]>();
    @Output() rowClick = new EventEmitter<any>();
  
    @ContentChild('cellTemplate', { static: false }) cellTemplate!: TemplateRef<any>;
  
    onPage(event: any): void {
      this.pageChange.emit(event);
    }
  
    onSort(event: any): void {
      this.sortChange.emit(event);
    }
  
    onSelectionChange(event: any): void {
      this.selectionChange.emit(event);
    }
  
    onRowClick(rowData: any): void {
      if (this.rowClickable) {
        this.rowClick.emit(rowData);
      }
    }
  
    getValue(row: any, field: string): any {
      return row[field];
    }
  
    hasCellTemplate(column: DataTableColumn): boolean {
      return !!this.cellTemplate && column.cellTemplate !== undefined;
    }
  }
