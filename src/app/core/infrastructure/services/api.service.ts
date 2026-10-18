import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CalculationHistory,
  Formula,
  PricingPage,
  PricingRefs,
  PricingFilterValues,
  SellerSession,
} from '../interfaces/contracts.interfaces';
import type { PricingQuery } from '../../../pages/pricing/infrastructure/interfaces/pricing-query.interfaces';
import { queryParams } from '../../../pages/pricing/infrastructure/utils/pricing-query.utils';
import type {
  EditorConfig,
  Scope,
  BulkPreview,
  BulkOperation,
  EditResult,
} from '../../../pages/pricing/infrastructure/interfaces/editor-contracts.interfaces';

@Injectable({ providedIn: 'root' })
export class Api {
  pricingSales(offer: string) {
    return this.http.get<import('../contracts').PricingSalesSnapshot>(
      '/v2/api/pricing/sales/' + encodeURIComponent(offer),
    );
  }
  pricingColumnValues(field: string, filters: Record<string, unknown>) {
    return this.http.post<{ values: string[] }>('/v2/api/pricing/column-values', {
      field,
      filters,
    });
  }
  private readonly http = inject(HttpClient);
  exportPricingRepairs(scope: Scope) {
    return this.http.post('/v2/api/pricing/repair/export', { scope }, { responseType: 'blob' });
  }
  session() {
    return this.http.get<SellerSession>('/v2/api/auth/session');
  }
  pricing(query: PricingQuery) {
    return this.http.get<PricingPage>('/v2/api/pricing/configs', {
      params: new HttpParams({
        fromObject: {
          ...queryParams(query),
          ...(query.ship_method ? { ship_method: query.ship_method.toUpperCase() } : {}),
        },
      }),
    });
  }
  refs() {
    return this.http.get<PricingRefs>('/v2/api/pricing/refs');
  }
  pricingFilterValues() {
    return this.http.get<PricingFilterValues>('/v2/api/pricing/filter-values');
  }
  formula() {
    return this.http.get<Formula>('/v2/api/pricing/formula');
  }
  history(offer: string) {
    return this.http.get<CalculationHistory>(
      '/v2/api/pricing/calculations/' + encodeURIComponent(offer),
      { params: { limit: 20 } },
    );
  }
  workspace() {
    return this.http.get<{ mode: string; can_manage: boolean }>('/v2/api/pricing/editor/workspace');
  }
  editor(offer: string) {
    return this.http.get<EditorConfig>('/v2/api/pricing/editor/config', {
      params: { offer_id: offer },
    });
  }
  saveEditor(
    offer: string,
    version: string,
    changes: Record<string, unknown>,
    recalculate: boolean,
  ) {
    return this.http.post<EditResult>('/v2/api/pricing/editor/save', {
      offer_id: offer,
      expected_version: version,
      changes,
      recalculate,
    });
  }
  working(offer: string, version: string, value: Record<string, unknown>) {
    return this.http.post<EditResult>('/v2/api/pricing/editor/working', {
      offer_id: offer,
      expected_version: version,
      value,
    });
  }
  selection(scope: Scope) {
    return this.http.post<{ offer_ids: string[]; total: number }>(
      '/v2/api/pricing/editor/selection',
      scope,
    );
  }
  recalculate(scope: Scope, skip_locked = true) {
    return this.http.post<EditResult>('/v2/api/pricing/editor/recalc', { scope, skip_locked });
  }
  bulkPreview(scope: Scope, changes: Record<string, unknown>, include_locked: boolean) {
    return this.http.post<BulkPreview>('/v2/api/pricing/editor/preview', {
      scope,
      changes,
      include_locked,
    });
  }
  bulkApply(id: string) {
    return this.http.post<EditResult>('/v2/api/pricing/editor/apply/' + encodeURIComponent(id), {
      confirm: true,
    });
  }
  bulkUndo(id: string) {
    return this.http.post<EditResult>('/v2/api/pricing/editor/undo/' + encodeURIComponent(id), {
      confirm: true,
    });
  }
  operations() {
    return this.http.get<{ items: BulkOperation[] }>('/v2/api/pricing/editor/operations');
  }
  operation(id: string) {
    return this.http.get<BulkOperation>(
      '/v2/api/pricing/editor/operations/' + encodeURIComponent(id),
    );
  }
  saveFormula(body: Record<string, unknown>) {
    return this.http.put<Formula>('/v2/api/pricing/formula', { ...body, confirm: true });
  }
  saveMargin(body: Record<string, unknown>, category = false) {
    return this.http.post<EditResult>(
      category ? '/v2/api/pricing/category-margin' : '/v2/api/pricing/margin',
      body,
    );
  }
  pricingViews() {
    return this.http.get<{
      items: { id: string; name: string; query: PricingQuery; default: boolean }[];
    }>('/v2/api/pricing/views');
  }
  savePricingView(body: { id?: string; name: string; query: PricingQuery; default: boolean }) {
    return this.http.post('/v2/api/pricing/views/save', body);
  }
  deletePricingView(id: string) {
    return this.http.post('/v2/api/pricing/views/delete', { id });
  }
  initializePricing() {
    return this.http.post<{ created: number; message: string }>('/v2/api/pricing/initialize', {});
  }
  refreshPricingAdvertising() {
    return this.http.post<{ message: string }>('/v2/api/pricing/advertising/refresh', {});
  }
  previewPricingPublication(scope: Scope) {
    return this.http.post<
      import('../../../pages/pricing/components/publication-preview/infrastructure/interfaces/publication-preview.interfaces').PricingPublicationRun
    >('/v2/api/pricing/publication/preview', { scope });
  }
  pricingPublicationRuns() {
    return this.http.get<{
      items: import('../../../pages/pricing/components/publication-preview/infrastructure/interfaces/publication-preview.interfaces').PricingPublicationRun[];
      sends_enabled: boolean;
      automation_enabled: boolean;
    }>('/v2/api/pricing/publication/runs');
  }
}
