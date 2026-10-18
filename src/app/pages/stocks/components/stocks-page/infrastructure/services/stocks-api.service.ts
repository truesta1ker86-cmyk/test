import { STOCKS_API_API_ROOT } from '../constants/stocks-api.constants';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { stockParams } from '../../../../infrastructure/utils/filter-state.utils';
import type { StockQuery } from '../../../../infrastructure/types/filter-state.types';
import type {
  ExpectedPlan,
  ExpectedPreview,
  MatrixCell,
  MatrixPreview,
  RawStock,
  Rule,
  StockContext,
  StockFact,
  StockOperation,
  StockPage,
  StockRunPreview,
} from '../../../../infrastructure/interfaces/contracts.interfaces';

@Injectable()
export class StocksApi {
  private readonly http = inject(HttpClient);
  private readonly root = STOCKS_API_API_ROOT;
  facts(query: StockQuery) {
    return this.http.get<StockPage<StockFact>>(this.root + '/reconciliation', {
      params: new HttpParams({ fromObject: stockParams(query) }),
    });
  }
  raw(query: StockQuery) {
    return this.http.get<StockPage<RawStock>>(this.root + '/raw', {
      params: new HttpParams({ fromObject: stockParams(query) }),
    });
  }
  context() {
    return this.http.get<StockContext>(this.root + '/context');
  }
  rules(query: StockQuery) {
    return this.http.get<StockPage<Rule>>(this.root + '/rules', {
      params: new HttpParams({ fromObject: stockParams(query) }),
    });
  }
  selection(query: StockQuery) {
    return this.http.post<{ offer_ids: string[]; names?: Record<string, string> }>(
      this.root + '/selection',
      query,
    );
  }
  refresh() {
    return this.http.post(this.root + '/warehouses/refresh', {});
  }
  runPreview(offer_ids: string[]) {
    return this.http.post<StockRunPreview>(this.root + '/run-preview', {
      offer_ids,
      dry_run: true,
    });
  }
  save(rule: Rule) {
    const { version, ...value } = rule;
    return this.http.post<Rule>(this.root + '/rule/save', { ...value, expected_version: version });
  }
  preview(items: MatrixCell[]) {
    return this.http.post<MatrixPreview>(this.root + '/matrix/preview', { items });
  }
  action(action: 'apply' | 'undo', operation_id: string, confirm_fake = false) {
    return this.http.post<{ applied?: number; undone?: number; conflicts?: number }>(
      this.root + '/matrix/' + action,
      { operation_id, confirm: true, confirm_fake },
    );
  }
  history() {
    return this.http.get<{ items: StockOperation[] }>(this.root + '/operations');
  }
  expected(q = '') {
    return this.http.get<{ items: ExpectedPlan[] }>(this.root + '/expected', { params: { q } });
  }
  expectedPreview(arrival_date: string, items: { offer_id: string; expected_qty: number }[]) {
    return this.http.post<ExpectedPreview>(this.root + '/expected/preview', {
      arrival_date,
      items,
    });
  }
  expectedApply(operation_id: string) {
    return this.http.post(this.root + '/expected/apply', { operation_id, confirm: true });
  }
}
