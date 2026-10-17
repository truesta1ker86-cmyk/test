import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MappingCandidate, MappingComparison } from './mapping-logic';
import {
  ActionKind,
  Candidate,
  CardWorkspace,
  CatalogOperation,
  CatalogPage,
  CatalogQuery,
  CatalogRow,
  CharacteristicCandidate,
  SavedView,
  ProductDetailsData,
  CampaignPlan,
} from './contracts';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  mappingSnapshot() {
    return this.http.get<{ items: MappingCandidate[]; local_preview?: boolean }>(
      '/v2/api/catalog-v2/mapping/snapshot',
    );
  }
  mappingRows(offer_ids: string[]) {
    return this.http.post<{ items: CatalogRow[] }>('/v2/api/catalog-v2/mapping/rows', {
      offer_ids,
    });
  }
  mappingCompare(offer_id: string, search: string) {
    return this.http.get<{ items: MappingComparison[] }>('/v2/api/catalog-v2/mapping/compare', {
      params: { offer_id, search },
    });
  }
  mappingPreview(
    items: {
      onec_code?: string;
      offer_id: string;
      identity: string;
      units_per_item: number;
      expected_version: string;
    }[],
  ) {
    return this.http.post<CatalogOperation>('/v2/api/catalog-v2/mapping/preview', { items });
  }
  views() {
    return this.http.get<{ items: SavedView[] }>('/v2/api/catalog-v2/views');
  }
  saveView(name: string, query: CatalogQuery) {
    return this.http.post<{ view_id: string }>('/v2/api/catalog-v2/views/save', { name, query });
  }
  deleteView(view_id: string) {
    return this.http.post('/v2/api/catalog-v2/views/delete', { view_id });
  }
  list(query: CatalogQuery) {
    return this.http.get<CatalogPage>('/v2/api/catalog-v2/list', {
      params: new HttpParams({ fromObject: { ...query } }),
    });
  }
  selection(query: CatalogQuery) {
    return this.http.post<{ offer_ids: string[]; total: number }>('/v2/api/catalog-v2/selection', {
      query,
    });
  }
  export(query: CatalogQuery) {
    return this.http.post<{ items: CatalogRow[] }>('/v2/api/catalog-v2/export', { query });
  }
  item(offer_id: string) {
    return this.http.get<{ version: string; row?: CatalogRow }>('/v2/api/catalog-v2/item', {
      params: { offer_id },
    });
  }
  details(offer_id: string, days: number) {
    return this.http.get<ProductDetailsData>('/v2/api/catalog-v2/details', {
      params: { offer_id, days },
    });
  }
  campaign(offer_ids: string[], action: string) {
    return this.http.post<CampaignPlan>('/v2/api/catalog-v2/campaign/preview', {
      offer_ids,
      action,
    });
  }
  card(offer_id: string) {
    return this.http.get<CardWorkspace>('/v2/api/catalog-v2/card', { params: { offer_id } });
  }
  saveCard(offer_id: string, expected_version: string, changes: Record<string, unknown>) {
    return this.http.post<CardWorkspace>('/v2/api/catalog-v2/card/save', {
      offer_id,
      expected_version,
      changes,
    });
  }
  candidates(search: string) {
    return this.http.get<{ items: Candidate[] }>('/v2/api/catalog-v2/candidates', {
      params: { search },
    });
  }
  characteristics(offer_id: string) {
    return this.http.get<{ items: CharacteristicCandidate[] }>(
      '/v2/api/catalog-v2/characteristics',
      { params: { offer_id } },
    );
  }
  preview(
    kind: ActionKind,
    offer_ids: string[],
    changes: Record<string, unknown>,
    expected_versions: Record<string, string>,
  ) {
    return this.http.post<CatalogOperation>('/v2/api/catalog-v2/preview', {
      kind,
      offer_ids,
      changes,
      expected_versions,
    });
  }
  apply(operation_id: string) {
    return this.http.post<CatalogOperation>('/v2/api/catalog-v2/apply', {
      operation_id,
      confirm: true,
    });
  }
  undo(operation_id: string) {
    return this.http.post<CatalogOperation>('/v2/api/catalog-v2/undo', {
      operation_id,
      confirm: true,
    });
  }
  operation(operation_id: string) {
    return this.http.get<CatalogOperation>('/v2/api/catalog-v2/operation', {
      params: { operation_id },
    });
  }
  operations() {
    return this.http.get<{ items: CatalogOperation[] }>('/v2/api/catalog-v2/operations');
  }
}
