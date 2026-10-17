import { Component, computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { SessionContext } from '../core/session-context';
import { CatalogSelections } from '../catalog/selection';
import { CatalogCampaign } from '../catalog/catalog-campaign';
import { errorMessage } from '../core/api';
import { date } from '../core/format';
import { currency } from '../workspace/format';
import { Icon } from '../shared/icon';
import { ProductName } from '../shared/product-name';
import { StockChoiceFilter } from '../stocks/stock-choice';
import {
  FinanceColumnFilter,
  FinanceColumnChange,
  FinanceColumnRules,
} from '../finance/finance-column-filter';
import { PromotionsApi } from './api';
import {
  CategoryRule,
  Policy,
  CampaignRow,
  PromoWorkspace,
  PromotionModel,
  RuleOperation,
  modelLabel,
  modelHelp,
} from './contracts';
import { matchesColumns, sortTable, TableValues } from './table-logic';
import { PromotionModelEditor } from './model-editor';
@Injectable({ providedIn: 'root' })
export class PromotionDrafts {
  private shops = new Map<
    number,
    {
      categories: ReturnType<typeof signal<Set<number>>>;
      drafts: ReturnType<typeof signal<Map<number, PromotionModel>>>;
    }
  >();
  forShop(id: number) {
    if (!this.shops.has(id))
      this.shops.set(id, {
        categories: signal(new Set<number>()),
        drafts: signal(new Map<number, PromotionModel>()),
      });
    return this.shops.get(id)!;
  }
}
interface Filter {
  q: string;
  category: string;
  action: string;
  decision: string;
  participating: string;
  models: string[];
}
@Component({
  selector: 'app-promotions-page',
  imports: [
    FormsModule,
    RouterLink,
    ProductName,
    Icon,
    StockChoiceFilter,
    FinanceColumnFilter,
    CatalogCampaign,
    PromotionModelEditor,
  ],
  templateUrl: './promotions-page.html',
  styleUrl: './promotions-page.css',
})
export class PromotionsPage {
  readonly databaseCopy = inject(SessionContext).databaseCopy;
  readonly api = inject(PromotionsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly tenant = inject(SessionContext).session()!.tenant_id;
  private readonly local = inject(PromotionDrafts).forShop(this.tenant);
  readonly selection = inject(CatalogSelections).scope(this.tenant, 'products');
  readonly categories = this.local.categories;
  readonly drafts = this.local.drafts;
  readonly data = signal<PromoWorkspace | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly tab = signal('campaigns');
  readonly modelOffers = signal<string[] | null>(null);
  readonly planOffers = signal<string[] | null>(null);
  readonly planAction = signal<number | null>(null);
  readonly filter = signal<Filter>({
    q: '',
    category: '',
    action: '',
    decision: '',
    participating: 'all',
    models: [],
  });
  readonly columnState = signal<Record<string, FinanceColumnRules>>({});
  readonly sorting = signal({ key: '', desc: false });
  readonly columnRules = computed(() => this.columnState()[this.tab()] || {});
  readonly canWrite = computed(
    () => !this.loading() && !this.busy() && !this.error() && this.api.allowed(this.data()),
  );
  readonly columns = computed<{ key: string; label: string; numeric?: boolean }[]>(() =>
    this.tab() === 'categories'
      ? [
          { key: 'category', label: 'Категория маркетплейса' },
          { key: 'products', label: 'Товаров', numeric: true },
          { key: 'model', label: 'Модель акций' },
        ]
      : this.tab() === 'products'
        ? [
            { key: 'offer_id', label: 'Артикул' },
            { key: 'name', label: 'Номенклатура' },
            { key: 'category', label: 'Категория маркетплейса' },
            { key: 'own', label: 'Индивидуальное правило' },
            { key: 'model', label: 'Итоговая модель' },
            { key: 'source', label: 'Источник' },
          ]
        : [
            { key: 'offer_id', label: 'Артикул' },
            { key: 'name', label: 'Номенклатура' },
            { key: 'action', label: 'Акция' },
            { key: 'participating', label: 'Участие' },
            { key: 'model', label: 'Модель акций' },
            { key: 'orders', label: 'Заказов за 7 суток', numeric: true },
            { key: 'current', label: 'Цена акции сейчас', numeric: true },
            { key: 'minimum', label: 'Минималка (справочно)', numeric: true },
            { key: 'proposed', label: 'Цена по модели', numeric: true },
            { key: 'decision', label: 'Результат и причина' },
          ],
  );
  readonly rows = computed(() => {
    const f = this.filter();
    let rows: (Policy | CategoryRule | CampaignRow)[] =
      this.tab() === 'categories'
        ? this.data()?.categories || []
        : this.tab() === 'products'
          ? this.data()?.products || []
          : this.data()?.preview.rows || [];
    rows = rows.filter((r) => {
      const v = this.values(r);
      const model =
        this.tab() === 'categories'
          ? (r as CategoryRule).model
          : this.tab() === 'products'
            ? (r as Policy).effective_model
            : (r as CampaignRow).model;
      const cid = (r as Policy).category_id;
      return (
        (!f.q ||
          f.q
            .toLocaleLowerCase('ru')
            .split(/\s+/)
            .every((t) =>
              String(this.tab() === 'categories' ? v['category'] : v['offer_id'] + ' ' + v['name'])
                .toLocaleLowerCase('ru')
                .includes(t),
            )) &&
        (!f.category || String(cid) === f.category) &&
        (!f.models.length || f.models.includes(model == null ? '__empty__' : String(model))) &&
        (this.tab() !== 'campaigns' ||
          ((!f.action || String((r as CampaignRow).action_id) === f.action) &&
            (!f.decision || (r as CampaignRow).decision === f.decision) &&
            (f.participating === 'all' ||
              (r as CampaignRow).participating === (f.participating === 'yes')))) &&
        matchesColumns(v, this.columnRules())
      );
    });
    return this.sorting().key
      ? sortTable(rows, (r) => this.values(r)[this.sorting().key], this.sorting().desc)
      : rows;
  });
  readonly options = computed(() => {
    const rows =
      this.tab() === 'categories'
        ? this.data()?.categories || []
        : this.tab() === 'products'
          ? this.data()?.products || []
          : this.data()?.preview.rows || [];
    return Object.fromEntries(
      this.columns().map((c) => [
        c.key,
        [...new Set(rows.map((r) => String(this.values(r)[c.key] ?? '__empty__')))].sort((a, b) =>
          a.localeCompare(b, 'ru', { numeric: true }),
        ),
      ]),
    );
  });
  readonly someSelected = computed(() => this.rows().some((r) => this.isSelected(r)));
  readonly allSelected = computed(
    () => !!this.rows().length && this.rows().every((r) => this.isSelected(r)),
  );
  readonly selectedCount = computed(() =>
    this.tab() === 'categories' ? this.categories().size : this.selection().size,
  );
  readonly hiddenCount = computed(
    () =>
      this.selectedCount() -
      this.rows()
        .filter((r) => this.isSelected(r))
        .reduce(
          (set, r) =>
            set.add(
              this.tab() === 'categories'
                ? String((r as CategoryRule).category_id)
                : (r as Policy).offer_id,
            ),
          new Set<string>(),
        ).size,
  );
  readonly date = date;
  readonly currency = currency;
  readonly label = modelLabel;
  readonly help = modelHelp;
  readonly decisions: Record<string, string> = {
    unchanged: 'Без изменений',
    add: 'Добавить в акцию',
    update: 'Изменить цену',
    remove: 'Убрать из акции',
    skip: 'Не участвовать',
    protected: 'Защищён',
    incomplete: 'Не хватает данных',
    unmanaged: 'Без модели',
  };
  q = '';
  category = '';
  action = '';
  decision = '';
  participating = 'all';
  models: string[] = [];
  bulkModel = 'choose';
  private read?: Subscription;
  private filtersByView = new Map<string, Filter>();
  private sortsByView = new Map<string, { key: string; desc: boolean }>();
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((p) => {
      const tab = p.get('tab') || 'campaigns';
      const previousTab = this.tab();
      if (tab !== previousTab) {
        this.sortsByView.set(previousTab, this.sorting());
        this.sorting.set(this.sortsByView.get(tab) || { key: '', desc: false });
      }
      this.tab.set(
        ['campaigns', 'products', 'categories', 'history'].includes(tab) ? tab : 'campaigns',
      );
      this.q = p.get('q') || '';
      this.category = p.get('category') || '';
      this.action = p.get('action') || '';
      this.decision = p.get('decision') || '';
      this.participating = p.get('participating') || 'all';
      try {
        const v = JSON.parse(p.get('models') || '[]');
        this.models = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
      } catch {
        this.models = [];
      }
      this.filter.set({
        q: this.q,
        category: this.category,
        action: this.action,
        decision: this.decision,
        participating: this.participating,
        models: this.models,
      });
    });
    this.load();
  }
  navigate(tab = this.tab()) {
    let f: Filter = {
      q: this.q,
      category: this.category,
      action: this.action,
      decision: this.decision,
      participating: this.participating,
      models: this.models,
    };
    if (tab !== this.tab()) {
      this.filtersByView.set(this.tab(), f);
      f = this.filtersByView.get(tab) || {
        q: '',
        category: '',
        action: '',
        decision: '',
        participating: 'all',
        models: [],
      };
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab,
        q: f.q || null,
        category: f.category || null,
        action: f.action || null,
        decision: f.decision || null,
        participating: f.participating === 'all' ? null : f.participating,
        models: f.models.length ? JSON.stringify(f.models) : null,
      },
    });
  }
  load() {
    this.read?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.read = this.api
      .workspace()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.data.set(r);
          this.loading.set(false);
          const offers = new Set(r.products.map((p) => p.offer_id)),
            cats = new Set(r.categories.map((c) => c.category_id));
          this.selection.update((s) => new Set([...s].filter((id) => offers.has(id))));
          this.categories.update((s) => new Set([...s].filter((id) => cats.has(id))));
          this.drafts.update(
            (d) =>
              new Map(
                [...d].filter(
                  ([id, m]) =>
                    cats.has(id) && r.categories.find((c) => c.category_id === id)?.model !== m,
                ),
              ),
          );
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }
  values(row: Policy | CategoryRule | CampaignRow): TableValues {
    if (this.tab() === 'categories') {
      const r = row as CategoryRule;
      return { category: r.category, products: r.products, model: modelLabel(r.model, true) };
    }
    if (this.tab() === 'products') {
      const r = row as Policy;
      return {
        offer_id: r.offer_id,
        name: r.name,
        category: r.category,
        own: modelLabel(r.model),
        model: r.effective_model == null ? 'Не назначена' : modelLabel(r.effective_model),
        source: this.source(r.model_source),
      };
    }
    const r = row as CampaignRow;
    return {
      offer_id: r.offer_id,
      name: r.name,
      action: r.action,
      participating: r.participating ? 'Участвует' : 'Не участвует',
      model: r.model == null ? 'Не назначена' : modelLabel(r.model),
      orders: r.orders_7_days,
      current: r.current_price,
      minimum: r.minimum_price,
      proposed: r.desired_price,
      decision: (this.decisions[r.decision] || r.decision) + ' ' + r.reason,
    };
  }
  columnChanged(e: FinanceColumnChange) {
    const rules = { ...this.columnRules() };
    e.rule ? (rules[e.field] = e.rule) : delete rules[e.field];
    this.columnState.update((s) => ({ ...s, [this.tab()]: rules }));
  }
  sort(key: string) {
    this.sorting.update((s) => ({ key, desc: s.key === key ? !s.desc : false }));
  }
  isSelected(row: Policy | CategoryRule | CampaignRow) {
    return this.tab() === 'categories'
      ? this.categories().has((row as CategoryRule).category_id)
      : this.selection().has((row as Policy).offer_id);
  }
  toggle(row: Policy | CategoryRule | CampaignRow, checked: boolean) {
    if (this.tab() === 'categories') {
      if (!this.canWrite()) return;
      this.categories.update((s) => {
        const n = new Set(s),
          id = (row as CategoryRule).category_id;
        checked ? n.add(id) : n.delete(id);
        return n;
      });
    } else
      this.selection.update((s) => {
        const n = new Set(s),
          id = (row as Policy).offer_id;
        checked ? n.add(id) : n.delete(id);
        return n;
      });
  }
  selectFiltered(checked = true) {
    for (const row of this.rows()) this.toggle(row, checked);
  }
  clear() {
    this.tab() === 'categories' ? this.categories.set(new Set()) : this.selection.set(new Set());
  }
  categoryModel(r: CategoryRule) {
    return this.drafts().has(r.category_id) ? this.drafts().get(r.category_id)! : r.model;
  }
  draft(r: CategoryRule, value: string) {
    const m = value === '' ? null : (Number(value) as PromotionModel);
    this.drafts.update((d) => {
      const n = new Map(d);
      m === r.model ? n.delete(r.category_id) : n.set(r.category_id, m);
      return n;
    });
  }
  saveCategory(row?: CategoryRule) {
    const state = this.data();
    if (!state || !this.canWrite()) return;
    const ids = row ? [row.category_id] : [...this.categories()];
    const model = row
      ? this.categoryModel(row)
      : this.bulkModel === ''
        ? null
        : (Number(this.bulkModel) as PromotionModel);
    if (!ids.length || (!row && this.bulkModel === 'choose')) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .save(state, 'category', ids, model)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.drafts.update((d) => new Map([...d].filter(([id]) => !ids.includes(id))));
          this.notice.set(
            'Модель сохранена для категорий: ' +
              r.changed +
              '. Индивидуальные правила и участие Ozon не изменены.',
          );
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  editModels(offers?: string[]) {
    if (!this.canWrite()) return;
    const ids = offers || [...this.selection()];
    if (ids.length) this.modelOffers.set(ids);
  }
  openPlan(offers?: string[], actionId?: number) {
    if (!this.canWrite()) return;
    const ids = offers || [...this.selection()];
    if (ids.length) {
      this.planAction.set(actionId ?? (this.action ? Number(this.action) : null));
      this.planOffers.set(ids);
    }
  }
  filteredOffers() {
    return [
      ...new Set(
        this.rows()
          .map((r) => (r as Policy).offer_id)
          .filter(Boolean),
      ),
    ];
  }
  savedModel() {
    this.notice.set('Индивидуальное правило сохранено локально. Участие и цены Ozon не изменены.');
    this.load();
  }
  undo(op: RuleOperation) {
    const state = this.data();
    if (!state || !this.canWrite()) return;
    this.busy.set(true);
    this.api
      .undo(state, op.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.notice.set(
            'Отменено: ' + r.undone + '. Поздних изменений пропущено: ' + r.conflicts,
          );
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  source(value: string) {
    return value === 'product'
      ? 'Индивидуальное правило'
      : value === 'category'
        ? 'Правило категории'
        : 'Не назначена';
  }
  product(row: Policy | CategoryRule | CampaignRow) {
    return row as Policy;
  }
  campaign(row: Policy | CategoryRule | CampaignRow) {
    return row as CampaignRow;
  }
  categoryRow(row: Policy | CategoryRule | CampaignRow) {
    return row as CategoryRule;
  }
  track(row: Policy | CategoryRule | CampaignRow) {
    return this.tab() === 'categories'
      ? (row as CategoryRule).category_id
      : this.tab() === 'campaigns'
        ? (row as CampaignRow).key
        : (row as Policy).offer_id;
  }
}
