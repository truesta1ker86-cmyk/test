import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
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
    pageSize: number = 50 // <-- 50, как в вашей таблице
  ): Observable<ListPage> {
    const requestPayload = { ...query, page, page_size: pageSize };

    return this.list(entity, requestPayload).pipe(
      map((response) => {
        return applyOperationalColumns(
          response,
          entity,
          query.column_filters,
        );
      })
    );
  }

  // Безопасная сборка параметров (чтобы массивы не ломались)
  private buildParams(query: any): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item) => params = params.append(key, String(item)));
      } else {
        params = params.set(key, String(value));
      }
    });
    return params;
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
