import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, throwError, toArray } from 'rxjs';
import { SessionContext } from '../core/session-context';
import { ListPage, ListQuery, OrderDetail, Overview } from './contracts';
@Injectable({ providedIn: 'root' })
export class WorkspaceApi {
  private readonly http = inject(HttpClient);
  private readonly context = inject(SessionContext);
  private allowed(local: boolean, write = false) {
    const s = this.context.session();
    return local && !!s && (!write || s.is_owner || s.role === 'manager');
  }
  localPrepare(posting_number: string, local: boolean) {
    if (!this.allowed(local, true))
      return throwError(() => new Error('Локальная сборка недоступна.'));
    return this.http.post<OrderDetail>('/v2/api/workspace-v2/orders/local/prepare', {
      posting_number,
      confirm: true,
    });
  }
  localLabels(posting_numbers: string[], local: boolean) {
    if (!this.allowed(local) || !posting_numbers.length)
      return throwError(() => new Error('Выберите готовые FBS-заказы в локальном макете.'));
    return this.http.post(
      '/v2/api/workspace-v2/orders/local/labels',
      { posting_numbers },
      { responseType: 'blob' },
    );
  }
  localExcel(query: ListQuery, local: boolean) {
    if (!this.allowed(local))
      return throwError(() => new Error('Локальная Excel-выгрузка недоступна.'));
    return this.http.post('/v2/api/workspace-v2/orders/local/excel', query, {
      responseType: 'blob',
    });
  }
  overview() {
    return this.http.get<Overview>('/v2/api/workspace-v2/overview');
  }
  list(entity: 'orders' | 'returns', query: ListQuery) {
    return this.http.get<ListPage>('/v2/api/workspace-v2/' + entity, {
      params: new HttpParams({ fromObject: { ...query } }),
    });
  }
  /** v1 loads every page before applying table actions; the screen has no pager. */
  listAll(entity: 'orders' | 'returns', query: ListQuery) {
    let nextPage = 1;
    const fetch = () => this.list(entity, { ...query, page: nextPage, page_size: 100 });
    return fetch().pipe(
      expand((page) => {
        if (!page.meta.has_more) return EMPTY;
        if (!page.items.length || page.meta.page !== nextPage)
          return throwError(() => new Error('Не удалось дочитать список. Повторите загрузку.'));
        nextPage++;
        return fetch();
      }),
      toArray(),
      map((pages) => ({
        ...pages[0],
        items: pages.flatMap((page) => page.items),
        meta: { ...pages[0].meta, page: 1, page_size: pages[0].meta.total, has_more: false },
      })),
    );
  }
  order(posting_number: string) {
    return this.http.get<OrderDetail>('/v2/api/workspace-v2/orders/detail', {
      params: { posting_number },
    });
  }
  export(entity: 'orders' | 'returns', query: ListQuery) {
    return this.http.post(
      '/v2/api/workspace-v2/export',
      { ...query, entity },
      { responseType: 'blob' },
    );
  }
}
