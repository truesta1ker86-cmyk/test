import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import {
  PromoWorkspace,
  PromotionPlan,
  PlanRequest,
  RuleOperation,
} from '../interfaces/contracts.interfaces';
import { PromotionModel } from '../types/contracts.types';

@Injectable({ providedIn: 'root' })
export class PromotionsApi {
  private http = inject(HttpClient);
  private context = inject(SessionContext);
  private root = '/v2/api/workspace-v2/promotions';
  allowed(state: PromoWorkspace | null) {
    const s = this.context.session();
    return (
      (state?.planning_enabled === true ||
        state?.local_preview === true ||
        (state?.sandbox_db === true && this.context.databaseCopy())) &&
      state.can_manage &&
      !!s &&
      (s.is_owner || s.role === 'manager')
    );
  }
  workspace() {
    return this.http.get<PromoWorkspace>(this.root + '/workspace');
  }
  restoreCatalog(state: PromoWorkspace) {
    if (!this.allowed(state)) return throwError(() => new Error('Обновление каталога недоступно.'));
    return this.http.post<{ restored: string[]; skipped: Record<string, string> }>(
      this.root + '/catalog/restore',
      {},
    );
  }
  save(
    state: PromoWorkspace,
    scope: 'category' | 'product',
    ids: (string | number)[],
    model: PromotionModel,
  ) {
    if (!this.allowed(state) || !ids.length || (scope === 'category' && model === 0))
      return throwError(
        () => new Error('Изменение правил доступно владельцу и менеджеру этого магазина.'),
      );
    return this.http.post<{ operation_id: string; changed: number }>(this.root + '/models/save', {
      scope,
      offer_ids: scope === 'product' ? ids : [],
      category_ids: scope === 'category' ? ids : [],
      model,
      expected_revision: state.revision,
    });
  }
  undo(state: PromoWorkspace, id: string) {
    if (!this.allowed(state)) return throwError(() => new Error('Изменение правил недоступно.'));
    return this.http.post<RuleOperation>(this.root + '/models/undo', {
      operation_id: id,
      confirm: true,
    });
  }
  prepare(state: PromoWorkspace, body: PlanRequest) {
    if (!this.allowed(state)) return throwError(() => new Error('Локальная проверка недоступна.'));
    return this.http.post<PromotionPlan>(this.root + '/local/prepare', body);
  }
  operation(state: PromoWorkspace, id: string) {
    if (!this.allowed(state)) return throwError(() => new Error('Локальный результат недоступен.'));
    return this.http.get<PromotionPlan>(this.root + '/local/operation', {
      params: { operation_id: id },
    });
  }
}
