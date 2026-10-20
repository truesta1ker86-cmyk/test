import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, EMPTY, expand, map, Observable, switchMap, throwError, toArray } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { ListPage, ListQuery, OrderDetail, Overview } from '../interfaces/contracts.interfaces';
import { applyOperationalColumns } from '../utils/operational-columns.utils';

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

  // Базовый метод (без применения колонок)
  list(entity: 'orders' | 'returns', query: ListQuery) {
    return this.http.get<ListPage>('/v2/api/workspace-v2/' + entity, {
      params: this.buildParams(query),
    });
  }

  // Метод для таблицы (с применением колонок)
  listPage(
    entity: 'orders' | 'returns',
    query: ListQuery,
    page: number,
    pageSize: number = 50, // <-- 50, как в вашей таблице
  ): Observable<ListPage> {
    const requestPayload = { ...query, page, page_size: pageSize };

    return this.list(entity, requestPayload).pipe(
      map((response) => {
        return applyOperationalColumns(response, entity, query.column_filters);
      }),
    );
  }

  // Безопасная сборка параметров (чтобы массивы не ломались)
  private buildParams(query: any): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item) => (params = params.append(key, String(item))));
      } else {
        params = params.set(key, String(value));
      }
    });
    return params;
  }

  /** Complete selection for exports; the displayed table stays paged. */
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
      map((pages) =>
        applyOperationalColumns(
          {
            ...pages[0],
            items: pages.flatMap((page) => page.items),
            meta: { ...pages[0].meta, page: 1, page_size: pages[0].meta.total, has_more: false },
          },
          entity,
          query.column_filters,
        ),
      ),
    );
  }
  order(posting_number: string) {
    return this.http.get<OrderDetail>('/v2/api/workspace-v2/orders/detail', {
      params: { posting_number },
    });
  }

  export(entity: 'orders' | 'returns', query: ListQuery, format: 'csv' | 'xlsx' = 'csv') {
    const { column_filters, ...filters } = query;
    const download = (row_ids?: number[]) =>
      this.http.post(
        '/v2/api/workspace-v2/export',
        {
          ...filters,
          entity,
          ...(format === 'xlsx' ? { format } : {}),
          ...(row_ids === undefined ? {} : { row_ids }),
        },
        { responseType: 'blob' },
      );
    return defer(() => {
      const rules: unknown = JSON.parse(column_filters || '{}');
      if (!rules || typeof rules !== 'object' || Array.isArray(rules))
        return throwError(() => new Error('Некорректный фильтр столбцов.'));
      if (!Object.keys(rules).length) return download();
      return this.listAll(entity, query).pipe(
        switchMap((page) => {
          if (page.items.length > 10000)
            return throwError(
              () => new Error('Уточните отбор: одна выгрузка содержит до 10 000 записей.'),
            );
          const ids = page.items.map((row) => row.id);
          if (ids.some((id) => !Number.isSafeInteger(id) || id! < 1))
            return throwError(() => new Error('Для выгрузки отбора требуется обновление API V2.'));
          return download(ids as number[]);
        }),
      );
    });
  }
}
