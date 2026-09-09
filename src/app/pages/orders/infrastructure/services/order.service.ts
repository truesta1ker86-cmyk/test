import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderAction, OrderFilter, OrderResponse } from '../interfaces/orders';


@Injectable()
export class OrderService {
  private apiUrl = '/api/1c/orders';

  constructor(private http: HttpClient) {}

  getOrders(filter: OrderFilter): Observable<OrderResponse> {
    let params = new HttpParams()
      .set('lifecycle', filter.lifecycle)
      .set('page', filter.page ?? 1)
      .set('page_size', filter.pageSize ?? 50);

    if (filter.status) params = params.set('status', filter.status);
    if (filter.scheme) params = params.set('scheme', filter.scheme);
    if (filter.search) params = params.set('search', filter.search);
    if (filter.sort) params = params.set('sort', filter.sort);

    return this.http.get<OrderResponse>(this.apiUrl, { params });
  }

  refreshOrders(): Observable<{ counts: { orders: number } }> {
    return this.http.post<{ counts: { orders: number } }>('/api/dashboard/sync/orders', {});
  }

  getAvailableActions(postingNumber: string): Observable<{ actions: OrderAction[]; notice: string; scheme: string; marketplace_status: string }> {
    return this.http.get<any>(`${this.apiUrl}/${postingNumber}/available-actions`);
  }

  executeAction(postingNumber: string, actionCode: string, confirm: boolean = true): Observable<{ notice: string }> {
    return this.http.post<{ notice: string }>(`${this.apiUrl}/${postingNumber}/actions/${actionCode}`, { confirm_live_write: confirm });
  }

  downloadLabel(postingNumber: string): Observable<Blob> {
    return this.http.post(`/api/export/labels`, { posting_numbers: [postingNumber], label_format: 'PDF_A6' }, { responseType: 'blob' });
  }

  downloadLabels(postingNumbers: string[]): Observable<Blob> {
    return this.http.post(`/api/export/labels`, { posting_numbers: postingNumbers, label_format: 'PDF_A6' }, { responseType: 'blob' });
  }
}