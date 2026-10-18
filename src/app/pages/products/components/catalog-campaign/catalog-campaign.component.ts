import { CATALOG_CAMPAIGN_FILTER_OPTIONS_2 } from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  computed as selectionComputed,
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CATALOG_CAMPAIGN_STATUS_LABELS } from './infrastructure/constants/catalog-campaign.constants';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ColumnChange, ColumnRules } from '../../../../shared/directives/filter-panel/filter-panel';
import { PromotionsApi } from '../../../push/infrastructure/services/promotions-api.service';
import type {
  PromoWorkspace,
  PromotionPlan,
  PlanRequest,
  PlanRow,
} from '../../../push/infrastructure/interfaces/contracts.interfaces';
import { modelLabel } from '../../../push/infrastructure/utils/contracts.utils';
import { matchesColumns, sortTable } from '../../../push/infrastructure/utils/table-logic.utils';
import type { TableValues } from '../../../push/infrastructure/types/table-logic.types';
import { money, date } from '../../../../core/infrastructure/utils/format.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-catalog-campaign',

  templateUrl: './catalog-campaign.component.html',
  styleUrls: ['../../infrastructure/styles/catalog-dialog.css', './catalog-campaign.component.css'],
})
export class CatalogCampaign implements OnInit, AfterViewInit, OnDestroy {
  readonly visibleTableSelection = selectionComputed(() =>
    this.rows().filter((row) => this.selected().has(row.offer_id)),
  );

  tableColumns1(p: PromotionPlan): DataTableColumn[] {
    return [
      { field: 'column_1', header: '', cellTemplate: { slot: 'cell1' } },
      { field: 'column_2', header: '', cellTemplate: { slot: 'cell2' } },
      {
        field: 'column_3',
        header: '',
        styleClass: 'product-cell',
        cellTemplate: { slot: 'cell3' },
      },
      { field: 'column_4', header: '', cellTemplate: { slot: 'cell4' } },
      { field: 'column_5', header: '', cellTemplate: { slot: 'cell5' } },
      { field: 'column_6', header: '', cellTemplate: { slot: 'cell6' } },
      { field: 'column_7', header: '', styleClass: 'desired', cellTemplate: { slot: 'cell7' } },
      { field: 'column_8', header: '', styleClass: 'reason-cell', cellTemplate: { slot: 'cell8' } },
      {
        field: 'column_9',
        header: '',
        styleClass: 'reason-cell warning',
        cellTemplate: { slot: 'cell9' },
      },
      { field: 'column_10', header: '', cellTemplate: { slot: 'cell10' } },
      ...(p.action.is_voucher_action
        ? [{ field: 'column_11', header: '', cellTemplate: { slot: 'cell11' } }]
        : []),
    ];
  }

  readonly offers = input.required<string[]>();
  readonly initialAction = input<number | null>(null);
  readonly closed = output<void>();
  readonly state = signal<PromoWorkspace | null>(null);
  readonly plan = signal<PromotionPlan | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly selected = signal(new Set<string>());
  readonly query = signal('');
  readonly status = signal('');
  readonly rules = signal<ColumnRules>({});
  readonly sorting = signal({ key: 'offer_id', desc: false });
  readonly now = signal(Date.now());
  readonly api = inject(PromotionsApi);
  private destroy = inject(DestroyRef);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previous: HTMLElement | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private request = 0;
  actionId = '';
  operation: PlanRequest['operation'] = 'join';
  priceMode: PlanRequest['price_mode'] = 'model';
  manual = '';
  stock = '';
  readonly money = money;
  readonly date = date;
  readonly label = modelLabel;
  readonly statusLabels: Record<string, string> = CATALOG_CAMPAIGN_STATUS_LABELS;
  readonly columns = computed(() => [
    { key: 'offer_id', label: 'Артикул' },
    { key: 'name', label: 'Номенклатура' },
    { key: 'status', label: 'Результат' },
    { key: 'current', label: 'Цена акции сейчас', numeric: true },
    { key: 'minimum', label: 'Минималка (справочно)', numeric: true },
    {
      key: 'desired',
      label: this.plan()?.action.is_voucher_action
        ? 'Новая цена промокода'
        : 'Новая предельная цена',
      numeric: true,
    },
    { key: 'reason', label: 'Причина' },
    { key: 'warning', label: 'Особенности операции' },
    { key: 'model', label: 'Модель акций' },
    ...(this.plan()?.action.is_voucher_action
      ? [{ key: 'stock', label: 'Количество', numeric: true }]
      : []),
  ]);
  readonly rows = computed(() => {
    const q = this.query().trim().toLocaleLowerCase('ru');
    const rows = (this.plan()?.rows || []).filter(
      (r) =>
        (!q ||
          q
            .split(/\s+/)
            .every((t) => (r.offer_id + ' ' + r.name).toLocaleLowerCase('ru').includes(t))) &&
        (!this.status() || r.status === this.status()) &&
        matchesColumns(this.values(r), this.rules()),
    );
    return sortTable(rows, (r) => this.values(r)[this.sorting().key], this.sorting().desc);
  });
  readonly options = computed(() =>
    Object.fromEntries(
      this.columns().map((c) => [
        c.key,
        [
          ...new Set(
            (this.plan()?.rows || []).map((r) => String(this.values(r)[c.key] ?? '__empty__')),
          ),
        ],
      ]),
    ),
  );
  readonly expired = computed(() => {
    const p = this.plan();
    return !!p && (p.status !== 'prepared' || Date.parse(p.expires_at) <= this.now());
  });
  readonly ready = computed(() => this.rows().filter((r) => r.status === 'ready'));
  readonly allSelected = computed(
    () => !!this.ready().length && this.ready().every((r) => this.selected().has(r.offer_id)),
  );
  readonly someSelected = computed(() => this.ready().some((r) => this.selected().has(r.offer_id)));
  readonly hiddenSelected = computed(
    () => this.selected().size - this.rows().filter((r) => this.selected().has(r.offer_id)).length,
  );
  readonly totals = computed(() => {
    const rows = this.plan()?.rows || [];
    return {
      ready: rows.filter((r) => r.status === 'ready').length,
      blocked: rows.filter((r) => r.status === 'blocked').length,
      unchanged: rows.filter((r) => r.status === 'unchanged').length,
    };
  });
  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
  }
  ngAfterViewInit() {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog().nativeElement.showModal();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .workspace()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (s) => {
          this.state.set(s);
          this.actionId = String(
            s.preview.actions.find((a) => a.id === this.initialAction())?.id ||
              s.preview.actions[0]?.id ||
              '',
          );
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  invalidate() {
    this.request++;
    this.busy.set(false);
    this.plan.set(null);
    this.selected.set(new Set());
    this.error.set('');
    this.rules.set({});
  }
  inspect() {
    const s = this.state();
    if (!s || this.busy() || !this.api.allowed(s)) return;
    this.error.set('');
    const body: PlanRequest = {
      action_id: Number(this.actionId),
      offer_ids: [...this.offers()],
      operation: this.operation,
      price_mode: this.operation === 'join' ? this.priceMode : 'model',
    };
    if (this.operation === 'join' && this.priceMode === 'manual') {
      const raw = this.manual.trim().replace(',', '.');
      if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) <= 0) {
        this.error.set('Укажите положительную цену с точностью до копейки.');
        return;
      }
      body.action_price = raw;
    }
    if (
      s.preview.actions.find((a) => a.id === body.action_id)?.is_voucher_action &&
      this.operation !== 'leave' &&
      this.stock.trim()
    ) {
      const n = Number(this.stock);
      if (!Number.isInteger(n) || n < 1 || n > 1000000) {
        this.error.set('Количество должно быть целым от 1 до 1 000 000.');
        return;
      }
      body.stock = n;
    }
    const token = ++this.request;
    this.busy.set(true);
    this.plan.set(null);
    this.selected.set(new Set());
    this.api
      .prepare(s, body)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          if (token !== this.request) return;
          this.plan.set(p);
          this.selected.set(
            new Set(p.rows.filter((r) => r.status === 'ready').map((r) => r.offer_id)),
          );
          this.now.set(Date.now());
          this.busy.set(false);
        },
        error: (e) => {
          if (token !== this.request) return;
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  recover() {
    const s = this.state(),
      p = this.plan();
    if (!s || !p || this.busy()) return;
    const token = ++this.request;
    this.busy.set(true);
    this.error.set('');
    this.api
      .operation(s, p.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (token !== this.request) return;
          this.plan.set(r);
          this.now.set(Date.now());
          if (r.status !== 'prepared') this.selected.set(new Set());
          this.busy.set(false);
        },
        error: (e) => {
          if (token !== this.request) return;
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  values(r: PlanRow): TableValues {
    return {
      offer_id: r.offer_id,
      name: r.name,
      status: this.statusLabels[r.status],
      current: r.current_price,
      minimum: r.minimum_price,
      desired: r.desired_price,
      reason: r.reason,
      warning: r.warning,
      model: modelLabel(r.model) + ' · ' + this.source(r.model_source),
      stock: r.stock,
    };
  }
  source(s: string) {
    return s === 'product'
      ? 'Индивидуальное правило'
      : s === 'category'
        ? 'Правило категории'
        : 'Не назначена';
  }
  columnChanged(e: ColumnChange) {
    this.rules.update((r) => {
      const n = { ...r };
      e.rule ? (n[e.field] = e.rule) : delete n[e.field];
      return n;
    });
  }
  sort(key: string) {
    this.sorting.update((s) => ({ key, desc: s.key === key ? !s.desc : false }));
  }
  toggle(row: PlanRow, checked: boolean) {
    if (row.status !== 'ready' || this.expired()) return;
    this.selected.update((s) => {
      const n = new Set(s);
      checked ? n.add(row.offer_id) : n.delete(row.offer_id);
      return n;
    });
  }
  selectFiltered(checked = true) {
    for (const row of this.ready()) this.toggle(row, checked);
  }
  clearSelection() {
    this.selected.set(new Set());
  }
  close(event?: Event) {
    event?.preventDefault();
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    this.request++;
    this.dialog().nativeElement.close();
    if (this.previous?.isConnected) this.previous.focus();
  }

  statusOptions() {
    return CATALOG_CAMPAIGN_FILTER_OPTIONS_2;
  }
}
