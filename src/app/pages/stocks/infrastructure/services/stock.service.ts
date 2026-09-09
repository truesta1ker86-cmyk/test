import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ReconciliationResponse, StocksResponse } from '../models/stock.model';
import { OzonWarehouse, OzonWarehouseResponse } from '../models/ozon-warehouse.model';


@Injectable()
export class StockService {
  private apiUrl = '/api/inventory';

  constructor(private http: HttpClient) {}

  getStocks(page = 1, pageSize = 10000): Observable<StocksResponse> {
    return this.http.get<StocksResponse>(`${this.apiUrl}/stocks?page=${page}&page_size=${pageSize}`);
  }

  getReconciliations(): Observable<ReconciliationResponse> {
    return this.http.get<ReconciliationResponse>(`${this.apiUrl}/reconciliations?page_size=10000`);
  }

  getWarehouses(): Observable<{ items: any[] }> {
    return this.http.get<{ items: any[] }>(`${this.apiUrl}/warehouses`);
  }

  getOzonWarehouses(): Observable<OzonWarehouseResponse> {
    return this.http.get<OzonWarehouseResponse>(`${this.apiUrl}/ozon-warehouses`);
  }

  refreshStocks(): Observable<any> {
    return this.http.post('/api/dashboard/sync/inventory', {});
  }

  getFilteredOzonWarehouses(): Observable<any[]> {
    return this.getOzonWarehouses().pipe(
      map(res => {
        const warehouses = res.items || [];
        return warehouses
          .filter(warehouse => !warehouse.status || warehouse.status === 'created')
          .map(warehouse => ({
            warehouse_id: String(warehouse.warehouse_id || '').trim(),
            warehouse_name: String(warehouse.warehouse_name || warehouse.warehouse_id || '').trim() || 'Без названия',
            is_rfbs: Boolean(warehouse.is_rfbs),
          }))
          .sort((a, b) => a.warehouse_name.localeCompare(b.warehouse_name, 'ru', { numeric: true }));
      })
    );
  }
}
