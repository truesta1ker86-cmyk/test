import { Observable } from 'rxjs';

export interface TablePage<T = any> {
  items: T[];
  meta: { total: number; page?: number; page_size?: number; has_more?: boolean };
}

export interface TableDataService {
  listPage(entity: string, query: any, page: number, pageSize: number): Observable<TablePage>;
}
