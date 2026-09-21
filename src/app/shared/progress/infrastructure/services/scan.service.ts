import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ScanService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/ozon/sync/full';

  startScan(): Observable<{ status: string; id?: number }> {
    return this.http.post<{ status: string; id?: number }>(this.apiUrl, {});
  }
}