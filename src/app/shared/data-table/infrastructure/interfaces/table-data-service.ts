import { Observable } from 'rxjs';
import { ListPage } from '../../../../pages/orders/infrastructure/interfaces/contracts.interfaces';

export interface TableDataService {
  listPage(
    entity: string,
    query: any,
    page: number,
    pageSize: number,
  ): Observable<ListPage>;
}
