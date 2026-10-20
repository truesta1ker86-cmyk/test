import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  computed as selectionComputed,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  MAPPING_WORKSPACE_TABLE_COLUMNS1,
  MAPPING_WORKSPACE_TABLE_COLUMNS2,
  MAPPING_WORKSPACE_TABLE_COLUMNS3,
  MAPPING_WORKSPACE_TABLE_COLUMNS4,
  MAPPING_WORKSPACE_TABLE_COLUMNS5,
  MAPPING_WORKSPACE_COLUMNS,
  MAPPING_CANDIDATE_LIMIT,
} from './infrastructure/constants/mapping-workspace.constants';
import { MappingDrafts } from './infrastructure/services/mapping-drafts.service';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi } from '../../../products/infrastructure/services/catalog-api.service';
import type {
  CatalogRow,
  CatalogOperation,
} from '../../../products/infrastructure/interfaces/contracts.interfaces';
import { mappingLabels } from '../../../products/infrastructure/constants/contracts.constants';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { money, date } from '../../../../core/infrastructure/utils/format.utils';
import { ColumnRules, ColumnChange } from '../../../../shared/directives/filter-panel/filter-panel';
import type {
  MappingCandidate,
  MappingComparison,
  MappingDraft,
} from '../../infrastructure/interfaces/mapping-logic.interfaces';
import {
  rowDraft,
  mappingIdentity,
  mappingUnits,
  inferMappingUnits,
  parseMappingPaste,
} from '../../infrastructure/utils/mapping-logic.utils';
import { mappingReasons } from '../../infrastructure/constants/mapping-logic.constants';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FilterService, MappingDrafts],

  selector: 'app-mapping-workspace',

  templateUrl: './mapping-workspace.component.html',
  styleUrls: [
    '../../../pricing/infrastructure/styles/pricing-workflow.css',
    '../../../pricing/components/pricing-grid/pricing-grid.component.css',
    './mapping-workspace.component.css',
  ],
})
export class MappingWorkspace {
  readonly visibleTableSelection = selectionComputed(() =>
    this.rows().filter((row) => this.selected().has(row.offer_id)),
  );

  tableColumns1(): DataTableColumn[] {
    return MAPPING_WORKSPACE_TABLE_COLUMNS1;
  }
  tableColumns2(): DataTableColumn[] {
    return MAPPING_WORKSPACE_TABLE_COLUMNS2;
  }
  tableColumns3(): DataTableColumn[] {
    return MAPPING_WORKSPACE_TABLE_COLUMNS3;
  }
  tableColumns4(): DataTableColumn[] {
    return MAPPING_WORKSPACE_TABLE_COLUMNS4;
  }
  tableColumns5(): DataTableColumn[] {
    return MAPPING_WORKSPACE_TABLE_COLUMNS5;
  }

  private api = inject(CatalogApi);
  private destroy = inject(DestroyRef);
  private tenant = inject(SessionContext).session()!.tenant_id;
  readonly drafts = inject(MappingDrafts).scope(this.tenant);
  readonly rows = input<CatalogRow[]>([]);
  readonly selected = input<Set<string>>(new Set());
  readonly allSelected = input(false);
  readonly canManage = input(false);
  readonly loading = input(false);
  readonly columnRules = input<ColumnRules>({});
  readonly columnOptions = input<Record<string, string[]>>({});
  readonly toggled = output<string>();
  readonly filteredSelected = output<boolean>();
  readonly columnChanged = output<ColumnChange>();
  readonly sorted = output<string>();
  readonly details = output<CatalogRow>();
  readonly card = output<CatalogRow>();
  readonly saved = output<void>();
  readonly candidates = signal<MappingCandidate[]>([]);
  readonly candidateQuery = signal('');
  readonly candidateHints = computed(() => this.candidateOptions(this.candidateQuery()));
  readonly snapshotReady = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly prepared = signal<MappingDraft[]>([]);
  readonly issues = signal<string[]>([]);
  readonly protectedCount = signal(0);
  readonly unchangedCount = signal(0);
  readonly preview = signal<CatalogOperation | null>(null);
  readonly uncertain = signal(false);
  readonly compareRow = signal<CatalogRow | null>(null);
  readonly comparison = signal<MappingComparison[]>([]);
  readonly compareBusy = signal(false);
  readonly compareError = signal('');
  readonly pickerRow = signal<CatalogRow | null>(null);
  readonly dirtyEntries = computed(() => [...this.drafts().values()]);
  readonly hiddenDirty = computed(
    () =>
      this.dirtyEntries().filter((d) => !this.rows().some((r) => r.offer_id === d.offer_id)).length,
  );
  readonly money = money;
  readonly date = date;
  readonly labels = mappingLabels;
  readonly reasons = mappingReasons;
  readonly columns = MAPPING_WORKSPACE_COLUMNS;
  target = '';
  unitsRule = 'infer';
  fixedUnits = '1';
  overwrite = false;
  paste = '';
  candidateSearch = '';
  compareSearch = '';
  private compareRequest = 0;
  constructor() {
    this.loadSnapshot();
  }
  loadSnapshot() {
    if (this.busy()) return;
    this.snapshotReady.set(false);
    this.error.set('');
    this.api
      .mappingSnapshot()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.candidates.set(r.items);
          this.snapshotReady.set(true);
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  filteredCandidates() {
    return this.candidateOptions(this.candidateSearch);
  }
  private candidateOptions(search: string) {
    const q = search.trim().toLocaleLowerCase('ru');
    const found: MappingCandidate[] = [];
    for (const candidate of this.candidates()) {
      if (
        !q ||
        [candidate.onec_code, candidate.sku_1c, candidate.onec_name]
          .join(' ')
          .toLocaleLowerCase('ru')
          .includes(q)
      ) {
        found.push(candidate);
        if (found.length === MAPPING_CANDIDATE_LIMIT) break;
      }
    }
    return found;
  }
  draft(row: CatalogRow) {
    return this.drafts().get(row.offer_id) || rowDraft(row);
  }
  changed() {
    this.prepared.set([]);
    this.issues.set([]);
    this.message.set('');
  }
  edit(row: CatalogRow, key: 'identity' | 'units', value: string) {
    if (this.busy() || !this.canManage()) return;
    const next = {
      ...this.draft(row),
      [key]: value,
      ...(key === 'identity' ? { explicitCode: undefined } : {}),
    };
    this.stage([next]);
    this.changed();
  }
  private stage(items: MappingDraft[]) {
    this.drafts.update((old) => {
      const next = new Map(old);
      for (const item of items) {
        if (
          item.identity.trim() === item.originalIdentity &&
          Number(item.units) === item.originalUnits
        )
          next.delete(item.offer_id);
        else next.set(item.offer_id, item);
      }
      return next;
    });
  }
  discard(offer?: string) {
    if (this.busy() || this.uncertain()) return;
    this.drafts.update((old) => {
      const next = new Map(old);
      offer ? next.delete(offer) : next.clear();
      return next;
    });
    this.changed();
  }
  prepareSelection() {
    if (this.busy() || !this.snapshotReady() || !this.canManage()) return;
    const ids = [...this.selected()];
    if (!ids.length) return;
    let fixed = 1;
    try {
      if (this.unitsRule === 'fixed') fixed = mappingUnits(this.fixedUnits);
    } catch (e) {
      this.error.set(errorMessage(e));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.changed();
    this.api
      .mappingRows(ids)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          const prepared: MappingDraft[] = [];
          const issues: string[] = [];
          let protectedCount = 0;
          let unchanged = 0;
          for (const row of r.items) {
            const current = this.draft(row);
            if (current.originalIdentity && !this.overwrite) {
              protectedCount++;
              continue;
            }
            try {
              const identity = mappingIdentity(
                this.target || current.identity,
                this.candidates(),
                current.originalIdentity,
              );
              if (!identity) throw new Error('Код / артикул 1С не задан.');
              const units =
                this.unitsRule === 'fixed'
                  ? fixed
                  : this.unitsRule === 'keep'
                    ? mappingUnits(current.units)
                    : inferMappingUnits(
                        row.name || '',
                        row.offer_id,
                        this.target.trim() || current.identity,
                      );
              if (identity === current.identity && units === Number(current.units)) {
                unchanged++;
                continue;
              }
              prepared.push({ ...current, identity, units: String(units) });
            } catch (e) {
              issues.push(row.offer_id + ': ' + errorMessage(e));
            }
          }
          this.prepared.set(prepared);
          this.issues.set(issues);
          this.protectedCount.set(protectedCount);
          this.unchangedCount.set(unchanged);
          this.busy.set(false);
          this.message.set(
            `Изменятся: ${prepared.length}. Защищены: ${protectedCount}. Без изменений: ${unchanged}. Проблем: ${issues.length}. Ничего ещё не сохранено.`,
          );
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  preparePaste() {
    if (this.busy() || !this.snapshotReady() || !this.canManage()) return;
    let parsed: ReturnType<typeof parseMappingPaste>;
    try {
      parsed = parseMappingPaste(this.paste);
      if (!parsed.length) throw new Error('Нет строк товаров.');
    } catch (e) {
      this.error.set(errorMessage(e));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.changed();
    this.api
      .mappingRows(parsed.map((p) => p.offer_id))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          try {
            const prepared = parsed.map((p) => {
              const row = r.items.find((v) => v.offer_id === p.offer_id);
              if (!row) throw new Error('Товар не найден: ' + p.offer_id);
              const current = this.draft(row);
              return {
                ...current,
                identity: mappingIdentity(p.identity, this.candidates(), current.originalIdentity),
                units: p.units === null ? current.units : String(p.units),
              };
            });
            this.prepared.set(prepared);
            this.message.set(
              `Проверено строк: ${prepared.length}. Пустая связь очистит сопоставление; пустой квант сохранит текущее значение. Ничего ещё не сохранено.`,
            );
          } catch (e) {
            this.prepared.set([]);
            this.error.set(errorMessage(e));
          }
          this.busy.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  stagePrepared() {
    if (this.busy() || !this.canManage() || !this.prepared().length) return;
    this.stage(this.prepared());
    this.prepared.set([]);
    this.message.set('Правки перенесены в таблицу. Проверьте и нажмите «Сохранить все».');
  }
  save(offer?: string) {
    if (this.busy() || this.uncertain() || !this.snapshotReady() || !this.canManage()) return;
    const entries = this.dirtyEntries().filter((d) => !offer || offer === d.offer_id);
    if (!entries.length) return;
    let items;
    try {
      items = entries.map((d) => ({
        offer_id: d.offer_id,
        identity: mappingIdentity(
          d.identity,
          this.candidates(),
          d.originalIdentity,
          d.explicitCode,
        ),
        ...(d.explicitCode ? { onec_code: d.explicitCode } : {}),
        units_per_item: mappingUnits(d.units),
        expected_version: d.expected_version,
      }));
    } catch (e) {
      this.error.set(errorMessage(e));
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.submitted = new Set(entries.map((d) => d.offer_id));
    this.api
      .mappingPreview(items)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.preview.set(r);
          this.busy.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  apply() {
    const op = this.preview();
    if (!op || this.busy() || this.uncertain() || !this.canManage()) return;
    if (Date.parse(op.expires_at) <= Date.now()) {
      this.error.set('Предпросмотр истёк. Проверьте строки заново.');
      this.preview.set(null);
      return;
    }
    this.busy.set(true);
    this.api
      .apply(op.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.finish(r),
        error: (e) => {
          this.busy.set(false);
          this.uncertain.set(true);
          this.error.set(errorMessage(e) + ' Проверьте статус перед повтором.');
        },
      });
  }
  checkOperation() {
    const op = this.preview();
    if (!op || this.busy()) return;
    this.busy.set(true);
    this.api
      .operation(op.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (r.status === 'applied') this.finish(r);
          else {
            this.preview.set(r.status === 'preview' ? r : null);
            this.uncertain.set(false);
            this.busy.set(false);
            this.error.set(
              'Результат проверен. Правки в таблице сохранены для повторной проверки.',
            );
          }
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  private finish(op: CatalogOperation) {
    this.busy.set(false);
    this.uncertain.set(false);
    if (op.status !== 'applied') {
      this.error.set('Операция не применена. Проверьте статус.');
      return;
    }
    // Only submitted rows are removed; other pages' drafts remain intact.
    const ids = this.submitted;
    this.drafts.update((old) => new Map([...old].filter(([id]) => !ids.has(id))));
    this.preview.set(null);
    this.prepared.set([]);
    this.message.set(`Сохранено локально: ${op.applied}. Отправок не было.`);
    this.error.set('');
    this.saved.emit();
  }
  // Preview samples can contain only 20 rows; retain the complete submitted set.
  private submitted = new Set<string>();
  openCompare(row: CatalogRow) {
    this.compareRow.set(row);
    this.compareSearch = '';
    this.loadCompare();
  }
  closeCompare() {
    this.compareRequest++;
    this.compareRow.set(null);
    this.comparison.set([]);
    this.compareBusy.set(false);
  }
  loadCompare() {
    const row = this.compareRow();
    if (!row) return;
    const request = ++this.compareRequest;
    this.compareBusy.set(true);
    this.compareError.set('');
    this.api
      .mappingCompare(row.offer_id, this.compareSearch)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (request !== this.compareRequest) return;
          this.comparison.set(r.items);
          this.compareBusy.set(false);
        },
        error: (e) => {
          if (request !== this.compareRequest) return;
          this.compareError.set(errorMessage(e));
          this.compareBusy.set(false);
        },
      });
  }
  accept(candidate: MappingComparison) {
    const row = this.compareRow();
    if (!row || !candidate.can_accept || this.busy() || !this.canManage()) return;
    this.edit(row, 'identity', candidate.onec_code);
    this.closeCompare();
    this.message.set('Выбранный код перенесён в строку. Проверьте квант и сохраните.');
  }
  closePreview() {
    if (!this.busy() && !this.uncertain()) this.preview.set(null);
  }
  openPicker(row: CatalogRow) {
    this.pickerRow.set(row);
    this.candidateSearch = '';
  }
  chooseCandidate(candidate: MappingCandidate) {
    const row = this.pickerRow();
    if (!row || !candidate.onec_code || this.busy() || !this.canManage()) return;
    this.stage([
      { ...this.draft(row), identity: candidate.onec_code, explicitCode: candidate.onec_code },
    ]);
    this.changed();
    this.pickerRow.set(null);
  }
  comparisonLabel(key: string) {
    return (
      (
        {
          name: 'Название',
          description: 'Описание',
          color: 'Цвет',
          dimensions: 'Размеры',
          weight: 'Вес',
        } as Record<string, string>
      )[key] || key
    );
  }
  comparisonResult(key: string) {
    return (
      (
        {
          match: 'Совпало',
          close: 'Похоже',
          conflict: 'Не совпало',
          missing: 'Нет данных',
        } as Record<string, string>
      )[key] || key
    );
  }
}
