import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockFilter } from '../models/stock.model';

@Injectable()
export class ProductService {
  private apiUrl = '/api/products';

  constructor(private http: HttpClient) {}

  getProducts(days = 30, filter?: any): Observable<any> {
    let params = new HttpParams().set('days', days.toString());
    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.category) params = params.set('category', filter.category);
      if (filter.type) params = params.set('type', filter.type);
      if (filter.brand) params = params.set('brand', filter.brand);
    }
    return this.http.get(`${this.apiUrl}?${params.toString()}`);
  }

  /** Получение фацетов (группы, бренды, серии, длины, цвета, упаковки) */
  getFilterFacets(): Observable<any> {
    return this.http.get(`${this.apiUrl}/filter-facets`);
  }

  /** Автодополнение по названию товара с учётом фильтров */
  getNameSuggestions(query: string, filter?: StockFilter, limit: number = 20): Observable<any> {
    let params = new HttpParams().set('q', query).set('limit', limit.toString());
    if (filter) {
      if (filter.category) params = params.set('category', filter.category);
      if (filter.type) params = params.set('type', filter.type);
      if (filter.brand) params = params.set('brand', filter.brand);
      if (filter.group) params = params.set('group', filter.group);
      if (filter.series) params = params.set('series', filter.series);
      if (filter.length) params = params.set('length', filter.length);
      if (filter.color) params = params.set('color', filter.color);
      if (filter.package) params = params.set('package', filter.package);
    }
    return this.http.get(`${this.apiUrl}/name-suggestions`, { params });
  }

  syncProducts(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/sync`, {});
  }
}
