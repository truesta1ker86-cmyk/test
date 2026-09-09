import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StockService } from './stock.service';
import { ProductService } from './product.service';

@Injectable()
export class AllocationService {
  private apiUrl = '/api/stock-rules';

  constructor(
    private http: HttpClient,
    private stockService: StockService,
    private productService: ProductService,
  ) {}

  previewMatrix(drafts: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/matrix/preview`, { items: drafts });
  }

  applyMatrix(operationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/matrix/apply/${operationId}`, { confirm: true });
  }

  pushMatrix(operationId: string, dryRun: boolean = false): Observable<any> {
    return this.http.post(`${this.apiUrl}/matrix/push/${operationId}?dry_run=${dryRun}`, { confirm: true });
  }

  getRules(offerId?: string): Observable<any> {
    const url = offerId ? `${this.apiUrl}?offer_id=${offerId}` : this.apiUrl;
    return this.http.get(url);
  }

  getWarehouses(): Observable<any[]> {
    return this.stockService.getWarehouses().pipe(map(res => res.items || []));
  }
}
