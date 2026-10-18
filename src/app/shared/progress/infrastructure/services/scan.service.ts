import { SCAN_SERVICE_API_URL } from '../constants/scan.constants';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ScanService {
  private http = inject(HttpClient);
  private readonly apiUrl = SCAN_SERVICE_API_URL;

  startScan(): Observable<{ status: string; id?: number }> {
    return this.http.post<{ status: string; id?: number }>(this.apiUrl, {});
  }
}
