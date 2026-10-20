import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { SalesDynamics } from '../interfaces/sales-dynamics.interfaces';

@Injectable()
export class SalesDynamicsApi {
  private readonly http = inject(HttpClient);

  load(days: number) {
    return this.http.get<SalesDynamics>('/v2/api/workspace-v2/sales-dynamics', {
      params: { days },
    });
  }
}
