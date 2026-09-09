export interface DataTableColumn {
    field: string;
    header: string;
    sortable?: boolean;
    width?: string;
    styleClass?: string;
    cellTemplate?: any;
  }
  
  export interface DataTableConfig {
    columns: DataTableColumn[];
    data: any[];
    totalRecords?: number;
    loading?: boolean;
    rows?: number;
    first?: number;
    selection?: any[];
    selectionMode?: 'single' | 'multiple' | 'none';
    lazy?: boolean;
    sortField?: string;
    sortOrder?: 1 | -1;
    scrollable?: boolean;
    scrollHeight?: string;
    tableStyle?: any;
    showCurrentPageReport?: boolean;
    currentPageReportTemplate?: string;
  }