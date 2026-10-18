import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AiResult,
  AiStatus,
  AttributeDefinition,
  Category,
  CategoryPreview,
  DictionaryValue,
  FullWorkspace,
  MediaItem,
  Validation,
  AttributeOperation,
} from '../interfaces/contracts.interfaces';

@Injectable({ providedIn: 'root' })
export class CardsApi {
  private readonly http = inject(HttpClient);
  attributePreview(body: Record<string, unknown>) {
    return this.http.post<AttributeOperation>('/v2/api/cards-v2/attributes/preview', body);
  }
  attributeApply(operation_id: string) {
    return this.http.post<AttributeOperation>('/v2/api/cards-v2/attributes/apply', {
      operation_id,
      confirm: true,
    });
  }
  attributeUndo(operation_id: string) {
    return this.http.post<AttributeOperation>('/v2/api/cards-v2/attributes/undo', {
      operation_id,
      confirm: true,
    });
  }
  attributeOperation(operation_id: string) {
    return this.http.get<AttributeOperation>('/v2/api/cards-v2/attributes/operation', {
      params: { operation_id },
    });
  }
  attributeOperations() {
    return this.http.get<{ items: AttributeOperation[] }>('/v2/api/cards-v2/attributes/operations');
  }
  workspace(offer_id: string) {
    return this.http.get<FullWorkspace>('/v2/api/cards-v2/workspace', { params: { offer_id } });
  }
  create(
    offer_id: string,
    name: string,
    copy_from?: string,
    binding?: { onec_code: string; units_per_item: number },
  ) {
    return this.http.post<FullWorkspace>('/v2/api/cards-v2/create', {
      offer_id,
      name,
      ...(copy_from ? { copy_from } : {}),
      ...(binding ? { binding } : {}),
    });
  }
  save(
    offer_id: string,
    expected_version: string,
    changes: Record<string, unknown>,
    category_change_confirmed = false,
    discard_complex_attributes = false,
  ) {
    return this.http.post<FullWorkspace>('/v2/api/cards-v2/save', {
      offer_id,
      expected_version,
      changes,
      category_change_confirmed,
      discard_complex_attributes,
    });
  }
  restore(offer_id: string, expected_version: string, version: number) {
    return this.http.post<FullWorkspace>('/v2/api/cards-v2/restore', {
      offer_id,
      expected_version,
      version,
    });
  }
  validate(offer_id: string, payload: unknown) {
    return this.http.post<Validation>('/v2/api/cards-v2/validate', { offer_id, payload });
  }
  categories(search: string, page = 1) {
    return this.http.get<{ items: Category[]; total: number }>('/v2/api/cards-v2/categories', {
      params: { search, page },
    });
  }
  refreshCategories(category_id?: number, type_id?: number) {
    return this.http.post<{ synced: number }>('/v2/api/cards-v2/categories/refresh', {
      category_id,
      type_id,
    });
  }
  attributes(category_id: number, type_id: number) {
    return this.http.get<{ items: AttributeDefinition[] }>('/v2/api/cards-v2/attributes', {
      params: { category_id, type_id },
    });
  }
  categoryPreview(offer_id: string, category_id: number, type_id: number, attributes: unknown[]) {
    return this.http.post<CategoryPreview>('/v2/api/cards-v2/category/preview', {
      offer_id,
      category_id,
      type_id,
      attributes,
    });
  }
  dictionary(
    category_id: number,
    type_id: number,
    attribute_id: number,
    q: string,
    last_value_id = 0,
  ) {
    return this.http.get<{
      items: DictionaryValue[];
      source: string;
      warning: string | null;
      has_next: boolean;
    }>('/v2/api/cards-v2/dictionary', {
      params: { category_id, type_id, attribute_id, q, last_value_id },
    });
  }
  media(offer_id: string) {
    return this.http.get<{ items: MediaItem[] }>('/v2/api/cards-v2/media', {
      params: { offer_id },
    });
  }
  upload(offer_id: string, product_title: string, image_data_url: string) {
    return this.http.post<MediaItem>('/v2/api/cards-v2/media/upload', {
      offer_id,
      product_title,
      image_data_url,
      confirm: true,
      reuse_existing: true,
    });
  }
  aiStatus() {
    return this.http.get<AiStatus>('/v2/api/cards-v2/ai/status');
  }
  aiGenerate(body: Record<string, unknown>) {
    return this.http.post<AiResult>('/v2/api/cards-v2/ai/generate', body);
  }
  aiOperation(operation_id: string) {
    return this.http.get<AiResult>('/v2/api/cards-v2/ai/operation', { params: { operation_id } });
  }
  aiHistory(offer_id: string) {
    return this.http.get<{ items: AiResult[] }>('/v2/api/cards-v2/ai/history', {
      params: { offer_id },
    });
  }
  aiReview(operation_id: string, accepted: boolean) {
    return this.http.post<AiResult>('/v2/api/cards-v2/ai/review', { operation_id, accepted });
  }
}
