import { PRICING_PAGE_FILTER_OPTIONS_2 } from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import type { PricingFilterValues } from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { PricingSelection } from './infrastructure/services/pricing-selection.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  finalize,
  of,
  switchMap,
  from,
  concatMap,
  toArray,
  debounceTime,
  forkJoin,
} from 'rxjs';
import { Api } from '../../../../core/infrastructure/services/api.service';
import {
  errorMessage,
  downloadErrorMessage,
} from '../../../../core/infrastructure/utils/api.utils';
import type {
  PricingPage,
  PricingRow,
  PricingRefs,
} from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { money, percent } from '../../../../core/infrastructure/utils/format.utils';
import { parsePricingQuery, queryParams } from '../../infrastructure/utils/pricing-query.utils';
import type { PricingQuery } from '../../infrastructure/interfaces/pricing-query.interfaces';
import type { SortColumn } from '../../infrastructure/types/pricing-query.types';
import type {
  Scope,
  BulkOperation,
} from '../../infrastructure/interfaces/editor-contracts.interfaces';
import { filterScope } from '../../infrastructure/utils/editor-contracts.utils';
import type {
  PricingCellChange,
  PricingWorkingChange,
} from '../pricing-grid/infrastructure/types/pricing-grid.types';
import { editorFields } from '../../infrastructure/constants/editor-fields.constants';
import { editorValue, displayInput } from '../../infrastructure/utils/editor-fields.utils';
import { EditorDrafts } from '../../infrastructure/services/editor-drafts.service';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import type { PriceColumnChange } from '../pricing-column-filter/infrastructure/interfaces/pricing-column-filter.interfaces';
import { priceColumns } from '../pricing-column-filter/infrastructure/utils/pricing-column-filter.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FilterService, PricingSelection],

  selector: 'app-pricing-page',

  templateUrl: './pricing-page.component.html',
  styleUrls: ['./pricing-page.component.css', '../../infrastructure/styles/pricing-workflow.css'],
})
export class PricingPageComponent {
  readonly facets = signal<Record<string, string[]>>({});
  readonly filterChoices = signal<PricingFilterValues['fields']>({});
  readonly catalogFilters = signal<NonNullable<PricingRefs['catalog_filters']>>([]);
  readonly workspace = signal('calculation');
  readonly mode = signal('margin');
  private readonly tableDrafts = inject(EditorDrafts).forShop(
    inject(SessionContext).session()?.tenant_id || 0,
  );
  readonly drafts = this.tableDrafts.values;
  private readonly draftVersions = this.tableDrafts.versions;
  readonly dirtyCount = computed(() => Object.keys(this.drafts()).length);
  readonly repairFields = editorFields.filter(
    (f) => !['locked', 'ship_method', 'sku_1c'].includes(f.key),
  );
  repairField = 'manual_cost';
  repairValue = '';
  readonly data = signal<PricingPage | null>(null);
  readonly moreBusy = signal(false);
  readonly moreError = signal('');
  readonly loadedThroughPage = signal(1);
  readonly hasMore = computed(() => {
    const data = this.data();
    return (
      !!data && (this.query().page - 1) * this.query().page_size + data.items.length < data.total
    );
  });
  private listRevision = 0;
  readonly busy = signal(true);
  readonly error = signal('');
  readonly refsError = signal('');
  readonly finTypes = signal<string[]>([]);
  readonly finGroups = signal<{ report_type: string; label: string }[]>([]);
  readonly details = signal<PricingRow | null>(null);
  readonly editor = signal<string | null>(null);
  readonly bulk = signal<{ scope: Scope; label: string } | null>(null);
  readonly canManage = signal(false);
  readonly localPreview = signal(false);
  readonly actionBusy = signal(false);
  readonly actionError = signal('');
  readonly actionMessage = signal('');
  readonly operations = signal<BulkOperation[]>([]);
  readonly query = signal(parsePricingQuery({}));
  readonly selection = inject(PricingSelection);
  readonly bulkUsesSelection = signal(false);
  readonly inlineBulkScope = computed<Scope>(() =>
    this.bulkUsesSelection()
      ? { offer_ids: [...this.selection.selected()] }
      : filterScope(this.query()),
  );
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.data()?.total || 0) / this.query().page_size)),
  );
  readonly visibleSelected = computed(
    () =>
      this.data()?.items.filter((row) => this.selection.selected().has(row.offer_id)).length || 0,
  );
  readonly allPageSelected = computed(
    () => !!this.data()?.items.length && this.visibleSelected() === this.data()?.items.length,
  );
  readonly money = money;
  readonly percent = percent;
  readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    fin_type: new FormControl('', { nonNullable: true }),
    ship_method: new FormControl('', { nonNullable: true }),
    promo_below_minimum: new FormControl('', { nonNullable: true }),
  });
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly refresh = new BehaviorSubject(0);
  private loadedQuery = false;

  constructor() {
    this.form.controls.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.applyFilters());
    this.api
      .pricingViews()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          const view = r.items.find((v) => v.default);
          if (view && !Object.keys(this.route.snapshot.queryParams).length)
            this.applyQuery(view.query);
        },
        error: () => {},
      });
    this.api
      .workspace()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (state) => {
          this.canManage.set(state.can_manage);
          this.localPreview.set(state.mode === 'local-preview');
        },
        error: (error) => this.actionError.set(errorMessage(error)),
      });
    this.loadOperations();
    this.loadRefs();
    combineLatest([this.route.queryParamMap, this.refresh])
      .pipe(
        switchMap(([params]) => {
          this.workspace.set(
            params.get('workspace') === 'automation' ? 'automation' : 'calculation',
          );
          const query = parsePricingQuery(
            Object.fromEntries(params.keys.map((key) => [key, params.get(key) || ''])),
          );
          const navigation = this.router.currentNavigation();
          const ownUpdate =
            navigation?.trigger === 'imperative' &&
            navigation.extras.state?.['pricingQueryUpdate'] === true;
          if (
            !this.loadedQuery ||
            (!ownUpdate && JSON.stringify(query) !== JSON.stringify(this.query()))
          ) {
            this.form.patchValue(query, { emitEvent: false });
          }
          this.loadedQuery = true;
          this.listRevision++;
          this.moreBusy.set(false);
          this.moreError.set('');
          this.loadedThroughPage.set(query.page);
          this.query.set(query);
          this.details.set(null);
          this.data.set(null);
          this.busy.set(true);
          this.error.set('');
          return this.api.pricing(query).pipe(
            catchError((error) => {
              this.error.set(errorMessage(error));
              return of(null);
            }),
            finalize(() => this.busy.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((data) => this.data.set(data));
  }

  loadMore(): void {
    if (this.busy() || this.moreBusy() || !this.hasMore()) return;
    const revision = this.listRevision;
    const next = this.loadedThroughPage() + 1;
    this.moreBusy.set(true);
    this.moreError.set('');
    this.api
      .pricing({ ...this.query(), page: next })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (page) => {
          if (revision !== this.listRevision) return;
          this.moreBusy.set(false);
          const previous = this.data()!;
          const ids = new Set(previous.items.map((r) => r.offer_id));
          const added = page.items.filter((r) => !ids.has(r.offer_id));
          if (!added.length) {
            this.moreError.set('Список изменился. Обновите таблицу.');
            return;
          }
          this.loadedThroughPage.set(next);
          this.data.set({
            ...previous,
            total: page.total,
            items: [...previous.items, ...added],
            ready_on_page: previous.ready_on_page + page.ready_on_page,
            blocked_on_page: previous.blocked_on_page + page.blocked_on_page,
            inactive_on_page: previous.inactive_on_page + page.inactive_on_page,
          });
        },
        error: (error) => {
          if (revision !== this.listRevision) return;
          this.moreBusy.set(false);
          this.moreError.set(errorMessage(error));
        },
      });
  }
  loadRefs(): void {
    this.refsError.set('');
    this.api
      .pricingFilterValues()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (response) => this.filterChoices.set(response.fields),
        error: (error) => this.refsError.set(errorMessage(error)),
      });
    this.api
      .refs()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (refs) => {
          this.facets.set(refs.facets || {});
          this.finGroups.set(
            refs.fin_margin_groups ||
              (refs.facets?.['report_type'] || []).map((report_type) => ({
                report_type,
                label: report_type,
              })),
          );
          this.catalogFilters.set(refs.catalog_filters || []);
          this.finTypes.set(
            [...new Set(refs.filter_fin_types)].sort((a, b) => a.localeCompare(b, 'ru')),
          );
        },
        error: (error) => this.refsError.set(errorMessage(error)),
      });
  }
  update(values: Partial<PricingQuery>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...queryParams({ ...this.query(), ...values }),
        workspace: this.workspace() === 'automation' ? 'automation' : null,
      },
      state: { pricingQueryUpdate: true },
    });
  }
  applyFilters(): void {
    this.update({ search: this.form.controls.search.value, page: 1 });
  }
  applyColumn(change: PriceColumnChange) {
    const columns = priceColumns(this.query().column_filters);
    if (change.value) columns[change.field] = change.value;
    else delete columns[change.field];
    this.update({
      column_filters: Object.keys(columns).length ? JSON.stringify(columns) : '',
      page: 1,
    });
  }
  applyQuery(query: PricingQuery) {
    this.form.controls.search.setValue(query.search, { emitEvent: false });
    this.update(query);
  }
  resetFilters(): void {
    this.form.reset({ search: '', fin_type: '', ship_method: '', promo_below_minimum: '' });
    this.update({
      ...parsePricingQuery({}),
      results: this.query().results,
      page_size: this.query().page_size,
    });
  }
  reload(): void {
    this.refresh.next(this.refresh.value + 1);
  }
  sort(column: SortColumn): void {
    this.update({
      sort_by: column,
      sort_direction:
        this.query().sort_by === column && this.query().sort_direction === 'asc' ? 'desc' : 'asc',
      page: 1,
    });
  }
  togglePage(checked: boolean): void {
    this.selection.setPage(this.data()?.items.map((row) => row.offer_id) || [], checked);
  }
  status(row: PricingRow): string {
    return row.readiness_status === 'ready'
      ? 'Готов к расчёту'
      : row.readiness_status === 'inactive'
        ? 'Нет плана'
        : 'Нужны данные';
  }
  loadOperations(): void {
    this.api
      .operations()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => this.operations.set(data.items),
        error: (error) => this.actionError.set(errorMessage(error)),
      });
  }
  scope(selected = false): Scope {
    return selected
      ? { offer_ids: [...this.selection.selected()] }
      : filterScope({ ...this.query(), search: this.form.controls.search.value.trim() });
  }
  selectFiltered(): void {
    if (this.actionBusy()) return;
    this.actionBusy.set(true);
    this.actionError.set('');
    this.api
      .selection(this.scope())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.selection.setPage(data.offer_ids, true);
          this.actionBusy.set(false);
        },
        error: (error) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(error));
        },
      });
  }
  openBulk(selected = false): void {
    if (this.mode() === 'bulk') {
      this.bulkUsesSelection.set(selected);
      return;
    }
    this.bulk.set({
      scope: this.scope(selected),
      label: selected
        ? `Выбранные товары: ${this.selection.selected().size}`
        : `Товары по текущему фильтру: ${this.data()?.total || 0}`,
    });
  }
  recalculate(selected = false): void {
    if (this.actionBusy() || !this.canManage()) return;
    this.actionBusy.set(true);
    this.actionError.set('');
    this.actionMessage.set('');
    this.api
      .recalculate(this.scope(selected))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.actionBusy.set(false);
          this.actionMessage.set(
            data.message ||
              `Рассчитано ${data.recalculated} из ${data.total}. Ошибок ${data.failed || 0}.`,
          );
          this.reload();
        },
        error: (error) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(error));
        },
      });
  }
  changed(): void {
    this.reload();
    this.loadOperations();
    this.loadRefs();
  }
  stage(change: PricingCellChange) {
    this.stageValue(
      change.row.offer_id,
      change.row.version || '',
      change.field,
      change.row[change.field],
      change.value,
    );
  }
  private stageValue(
    offer: string,
    version: string,
    field: string,
    current: unknown,
    value: string,
  ) {
    const f = editorFields.find((f) => f.key === field)!;
    this.draftVersions.set(offer, this.draftVersions.get(offer) || version);
    this.drafts.update((previous) => {
      const next = { ...previous };
      const row = { ...next[offer] };
      if (value === displayInput(f, current)) delete row[field];
      else row[field] = value;
      if (Object.keys(row).length) next[offer] = row;
      else {
        delete next[offer];
        this.draftVersions.delete(offer);
      }
      return next;
    });
  }
  stageRepairs() {
    if (this.actionBusy() || !this.canManage() || !this.selection.selected().size) return;
    try {
      editorValue(
        editorFields.find((f) => f.key === this.repairField)!,
        this.repairValue,
      );
    } catch (e) {
      this.actionError.set(errorMessage(e));
      return;
    }
    const field = this.repairField,
      value = this.repairValue;
    this.actionBusy.set(true);
    this.actionError.set('');
    this.api
      .selection({ ...this.scope(), offer_ids: [...this.selection.selected()] })
      .pipe(
        switchMap((r) =>
          r.offer_ids.length
            ? forkJoin(r.offer_ids.map((offer) => this.api.editor(offer)))
            : of([]),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (rows) => {
          this.actionBusy.set(false);
          const editable = rows.filter((r) => !r['locked']);
          for (const row of editable)
            this.stageValue(row.offer_id, row.version, field, row[field], value);
          this.actionMessage.set(
            'Подготовлены правки: ' + editable.length + '. Сохраните их после проверки.',
          );
        },
        error: (e) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(e));
        },
      });
  }
  clearDrafts() {
    this.drafts.set({});
    this.draftVersions.clear();
  }
  saveInline(offer?: string) {
    if (this.actionBusy() || !this.canManage()) return;
    try {
      const pending = Object.entries(this.drafts())
        .filter(([id]) => !offer || id === offer)
        .map(([id, raw]) => ({
          id,
          changes: Object.fromEntries(
            Object.entries(raw).map(([key, value]) => [
              key,
              editorValue(
                editorFields.find((f) => f.key === key)!,
                value,
              ),
            ]),
          ),
          version: this.draftVersions.get(id) || '',
        }));
      if (!pending.length) return;
      this.actionBusy.set(true);
      this.actionError.set('');
      from(pending)
        .pipe(
          concatMap((p) =>
            this.api.saveEditor(p.id, p.version, p.changes, true).pipe(
              switchMap((result) =>
                of({ id: p.id, error: '', needsData: result.calculation?.ok === false }),
              ),
              catchError((e) => of({ id: p.id, error: errorMessage(e), needsData: false })),
            ),
          ),
          toArray(),
          takeUntilDestroyed(this.destroy),
        )
        .subscribe((results) => {
          this.actionBusy.set(false);
          const saved = results.filter((r) => !r.error);
          this.drafts.update((drafts) => {
            const next = { ...drafts };
            for (const r of saved) {
              delete next[r.id];
              this.draftVersions.delete(r.id);
            }
            return next;
          });
          const needsData = saved.filter((r) => r.needsData).length;
          this.actionMessage.set(
            `Сохранено: ${saved.length}. Рассчитано: ${saved.length - needsData}. Требуют данных: ${needsData}. Отправок не было.`,
          );
          this.actionError.set(
            results
              .filter((r) => r.error)
              .map((r) => r.id + ': ' + r.error)
              .join('\n'),
          );
          this.changed();
        });
    } catch (e) {
      this.actionError.set(errorMessage(e));
    }
  }
  saveWorkingCell(change: PricingWorkingChange) {
    if (this.actionBusy() || !this.canManage()) return;
    this.actionError.set('');
    this.actionMessage.set('');
    if (this.drafts()[change.row.offer_id]) {
      this.actionError.set('Сначала сохраните или отмените правки параметров этого товара.');
      return;
    }
    this.actionBusy.set(true);
    const value = change.reset
      ? { reset: true, reset_field: change.field }
      : { [change.field]: change.value };
    this.api
      .working(change.row.offer_id, change.row.version || '', value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.actionBusy.set(false);
          this.actionMessage.set(
            'Цена, минималка и целевая маржа пересчитаны локально. Отправок не было.',
          );
          this.changed();
        },
        error: (error) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(error));
        },
      });
  }
  recalculateOne(offer: string) {
    if (this.drafts()[offer]) {
      this.saveInline(offer);
      return;
    }
    this.runRecalculation({ offer_ids: [offer] }, false);
  }
  recalculateAll() {
    this.runRecalculation({});
  }
  private runRecalculation(scope: Scope, skipLocked = true) {
    if (this.actionBusy() || !this.canManage()) return;
    this.actionBusy.set(true);
    this.actionError.set('');
    this.api
      .recalculate(scope, skipLocked)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.actionBusy.set(false);
          this.actionMessage.set(
            `Рассчитано ${r.recalculated} из ${r.total}. Нужны данные: ${r.failed || 0}.`,
          );
          this.changed();
        },
        error: (e) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(e));
        },
      });
  }
  initialize() {
    if (this.actionBusy()) return;
    this.actionBusy.set(true);
    this.api
      .initializePricing()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.actionBusy.set(false);
          this.actionMessage.set(r.message);
          this.changed();
        },
        error: (e) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(e));
        },
      });
  }
  advertising() {
    this.api
      .refreshPricingAdvertising()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.actionMessage.set(r.message),
        error: (e) => this.actionError.set(errorMessage(e)),
      });
  }
  openPublication() {
    this.openWorkspace('automation');
  }
  openWorkspace(workspace: 'calculation' | 'automation') {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { workspace },
      queryParamsHandling: 'merge',
    });
  }
  exportRepairs() {
    if (this.actionBusy()) return;
    this.actionBusy.set(true);
    this.actionError.set('');
    this.api
      .exportPricingRepairs(this.scope(this.selection.selected().size > 0))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'uncalculated-products-local.xlsx';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.actionBusy.set(false);
        },
        error: async (e) => {
          this.actionBusy.set(false);
          this.actionError.set(await downloadErrorMessage(e));
        },
      });
  }
  undo(id: string): void {
    this.actionBusy.set(true);
    this.actionError.set('');
    this.api
      .bulkUndo(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.actionBusy.set(false);
          this.actionMessage.set(
            `Отменено ${data.undone || 0}. Конфликтов ${data.conflicts || 0}.`,
          );
          this.changed();
        },
        error: (error) => {
          this.actionBusy.set(false);
          this.actionError.set(errorMessage(error));
        },
      });
  }

  pageSizeOptions() {
    return PRICING_PAGE_FILTER_OPTIONS_2;
  }
}
