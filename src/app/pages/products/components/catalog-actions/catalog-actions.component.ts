import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import { CATALOG_ACTIONS_TABLE_COLUMNS1 } from './infrastructure/constants/catalog-actions.constants';
import {
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi } from '../../infrastructure/services/catalog-api.service';
import type { ActionKind } from '../../infrastructure/types/contracts.types';
import type {
  Candidate,
  CatalogOperation,
  CatalogRow,
  CharacteristicCandidate,
} from '../../infrastructure/interfaces/contracts.interfaces';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { editorValue } from '../../../pricing/infrastructure/utils/editor-fields.utils';
import { money, date } from '../../../../core/infrastructure/utils/format.utils';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-catalog-actions',

  templateUrl: './catalog-actions.component.html',
  styleUrl: '../../infrastructure/styles/catalog-dialog.css',
})
export class CatalogActions implements AfterViewInit {
  tableColumns1(): DataTableColumn[] {
    return CATALOG_ACTIONS_TABLE_COLUMNS1;
  }

  readonly kind = input.required<ActionKind>();
  readonly offers = input.required<string[]>();
  readonly initialField = input('');
  readonly row = input<CatalogRow>();
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly uncertain = signal(false);
  readonly preview = signal<CatalogOperation | null>(null);
  readonly candidates = signal<Candidate[]>([]);
  readonly candidate = signal<Candidate | null>(null);
  readonly comparisons = signal<CharacteristicCandidate[] | null>(null);
  readonly candidateBusy = signal(false);
  readonly candidateError = signal('');
  readonly money = money;
  readonly date = date;
  readonly form = new FormGroup({
    financeCategoryEnabled: new FormControl(false, { nonNullable: true }),
    financeTypeEnabled: new FormControl(false, { nonNullable: true }),
    marginEnabled: new FormControl(false, { nonNullable: true }),
    financeCategory: new FormControl('', { nonNullable: true }),
    financeType: new FormControl('', { nonNullable: true }),
    margin: new FormControl('', { nonNullable: true }),
    promotionModel: new FormControl('choose', { nonNullable: true }),
    action: new FormControl('link', { nonNullable: true }),
    units: new FormControl('', { nonNullable: true }),
    unitCost: new FormControl('', { nonNullable: true }),
    costAction: new FormControl('unit_cost', { nonNullable: true }),
    label: new FormControl('report_category', { nonNullable: true }),
    labelValue: new FormControl('', { nonNullable: true }),
    clear: new FormControl(false, { nonNullable: true }),
  });
  readonly search = new FormControl('', { nonNullable: true });
  private readonly api = inject(CatalogApi);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private versions: Record<string, string> = {};
  private candidateRequest = 0;

  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
    this.form.controls.units.setValue(String(this.row()?.units_per_item || 1));
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      if (!this.busy() && !this.uncertain()) this.preview.set(null);
    });
    if (this.initialField() === 'report_category')
      this.form.controls.financeCategoryEnabled.setValue(true);
    if (this.initialField() === 'report_type') this.form.controls.financeTypeEnabled.setValue(true);
    if (this.initialField() === 'fixed_margin') this.form.controls.marginEnabled.setValue(true);
    this.form.controls.financeCategory.setValue(this.row()?.report_category || '');
    this.form.controls.financeType.setValue(this.row()?.report_type || '');
    this.form.controls.margin.setValue(
      this.row()?.fixed_margin == null ? '' : String(Number(this.row()!.fixed_margin) * 100),
    );
    if (this.offers().length === 1) this.loadVersion();
    if (this.kind() === 'mapping') this.findCandidates();
  }
  loadVersion(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .item(this.offers()[0])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (item) => {
          this.versions = { [this.offers()[0]]: item.version };
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
  close(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  findCandidates(): void {
    const request = ++this.candidateRequest;
    this.candidateBusy.set(true);
    this.candidateError.set('');
    this.api
      .candidates(this.search.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          if (request !== this.candidateRequest) return;
          this.candidates.set(data.items);
          this.candidateBusy.set(false);
        },
        error: (error) => {
          if (request !== this.candidateRequest) return;
          this.candidateError.set(errorMessage(error));
          this.candidateBusy.set(false);
        },
      });
  }
  choose(value: Candidate): void {
    this.candidate.set(value);
    this.preview.set(null);
  }
  compare(): void {
    this.candidateBusy.set(true);
    this.candidateError.set('');
    this.api
      .characteristics(this.offers()[0])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.comparisons.set(result.items);
          this.candidateBusy.set(false);
        },
        error: (error) => {
          this.candidateError.set(errorMessage(error));
          this.candidateBusy.set(false);
        },
      });
  }
  chooseComparison(value: CharacteristicCandidate): void {
    this.candidate.set({
      sku_1c: value.sku_1c,
      onec_name: value.reference_name,
      available: 0,
      is_verified: true,
    });
    this.preview.set(null);
  }
  private changes(): Record<string, unknown> {
    const value = this.form.getRawValue();
    const units = () => {
      const n = Number(value.units);
      if (!Number.isInteger(n) || n < 1 || n > 1000000)
        throw new Error('Квант должен быть целым числом от 1 до 1 000 000.');
      return n;
    };
    if (this.kind() === 'finance') {
      const changes: Record<string, unknown> = {};
      if (value.financeCategoryEnabled)
        changes['report_category'] = value.financeCategory.trim() || null;
      if (value.financeTypeEnabled) changes['report_type'] = value.financeType.trim() || null;
      if (value.marginEnabled) {
        const margin = editorValue(
          { key: 'fixed_margin', label: 'Целевая маржа', kind: 'rate', nullable: true },
          value.margin,
        );
        if (margin !== null && (Number(margin) <= -1 || Number(margin) >= 1))
          throw new Error('Маржа должна быть больше −100% и меньше 100%.');
        changes['fixed_margin'] = margin;
      }
      if (!Object.keys(changes).length) throw new Error('Отметьте хотя бы одно поле.');
      return changes;
    }
    if (this.kind() === 'promotion') {
      if (!['', '0', '1', '2'].includes(value.promotionModel))
        throw new Error('Выберите модель акций.');
      return { promotion_model: value.promotionModel === '' ? null : Number(value.promotionModel) };
    }
    if (this.kind() === 'mapping') {
      if (value.action === 'clear') return { onec_code: null, sku_1c: null };
      if (value.action === 'quant') return { units_per_item: units() };
      const selected = this.candidate();
      if (!selected) throw new Error('Выберите точный товар из списка 1С.');
      return {
        ...(selected.onec_code ? { onec_code: selected.onec_code } : { sku_1c: selected.sku_1c }),
        units_per_item: units(),
      };
    }
    if (this.kind() === 'cost') {
      if (value.costAction === 'clear') return { unit_cost: null };
      const patch: Record<string, unknown> = {};
      if (value.costAction !== 'units_per_item') {
        const cost = value.unitCost.trim().replace(',', '.');
        if (!/^\d+(?:\.\d{1,4})?$/.test(cost) || Number(cost) <= 0)
          throw new Error(
            'Укажите положительную стоимость одной штуки, до четырёх знаков после запятой.',
          );
        patch['unit_cost'] = cost;
      }
      if (value.costAction !== 'unit_cost') patch['units_per_item'] = units();
      return patch;
    }
    if (value.label === 'locked') return { locked: value.labelValue === 'true' };
    if (!value.clear && !value.labelValue.trim())
      throw new Error('Введите значение или выберите очистку поля.');
    return { [value.label]: value.clear ? null : value.labelValue.trim() };
  }
  check(): void {
    if (this.busy() || this.loading() || this.uncertain()) return;
    if (this.offers().length === 1 && !Object.keys(this.versions).length) {
      this.loadVersion();
      return;
    }
    let changes: Record<string, unknown>;
    try {
      changes = this.changes();
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .preview(this.kind(), this.offers(), changes, this.versions)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.preview.set(result);
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  apply(): void {
    const current = this.preview();
    if (!current || this.busy() || this.uncertain()) return;
    if (new Date(current.expires_at).getTime() <= Date.now()) {
      this.preview.set(null);
      this.error.set('Предпросмотр истёк. Проверьте изменения заново.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .apply(current.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          if (result.status === 'applied') this.saved.emit();
          else {
            this.preview.set(null);
            this.error.set('Операция уже отменена. Создайте новый предпросмотр.');
          }
        },
        error: (error) => {
          this.busy.set(false);
          this.uncertain.set(true);
          this.error.set(
            errorMessage(error) + ' Проверяем результат через историю, прежде чем повторять.',
          );
          this.checkResult();
        },
      });
  }
  checkResult(): void {
    const current = this.preview();
    if (!current || this.busy()) return;
    this.busy.set(true);
    this.api
      .operation(current.operation_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.uncertain.set(false);
          if (result.status === 'applied') this.saved.emit();
          else {
            this.preview.set(result.status === 'preview' ? { ...current, ...result } : null);
            this.error.set(
              result.status === 'preview'
                ? 'Изменение не применено. Проверьте данные перед повтором.'
                : 'Операция отменена. Создайте новый предпросмотр.',
            );
          }
        },
        error: () => {
          this.busy.set(false);
          this.error.set(
            'Не удалось проверить результат. Обновите статус операции перед повтором.',
          );
        },
      });
  }
  previewValue(key: string, value: unknown) {
    if (key === 'promotion_model')
      return value == null
        ? 'По правилу категории'
        : (
            { 0: 'Не участвовать', 1: 'Бустинг и цена Ozon', 2: 'По минимальной цене' } as Record<
              string,
              string
            >
          )[String(value)] || this.show(value);
    return key === 'fixed_margin' && value != null
      ? (Number(value) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 6 }) + ' %'
      : this.show(value);
  }
  show(value: unknown): string {
    if (value === null || value === undefined) return 'Очистить';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  entries(value: Record<string, unknown>): [string, unknown][] {
    return Object.entries(value);
  }
  fieldLabel(key: string): string {
    return (
      (
        {
          onec_code: 'Код 1С',
          sku_1c: 'Артикул 1С',
          units_per_item: 'Квант',
          unit_cost: 'Стоимость штуки',
          report_category: 'Категория отчёта',
          report_type: 'Тип отчёта',
          fin_type: 'Тип Фин',
          brand: 'Бренд',
          category: 'Категория',
          locked: 'Блокировка',
          fixed_margin: 'Целевая маржа',
          promotion_model: 'Модель акций',
        } as Record<string, string>
      )[key] || key
    );
  }
  comparisonLabel(key: string): string {
    return (
      (
        {
          name: 'Название',
          color: 'Цвет',
          dimensions: 'Размеры',
          weight: 'Вес',
          description: 'Описание',
        } as Record<string, string>
      )[key] || key
    );
  }
}
