import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi } from '../../infrastructure/services/catalog-api.service';
import type { CatalogRow } from '../../infrastructure/interfaces/contracts.interfaces';
import type { MappingCandidate } from '../../../mapping/infrastructure/interfaces/mapping-logic.interfaces';
import { mappingUnits } from '../../../mapping/infrastructure/utils/mapping-logic.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { money, number } from '../../../../core/infrastructure/utils/format.utils';
import { EMPTY, switchMap } from 'rxjs';
import type { CardOneCChoice } from './infrastructure/interfaces/card-onec.interfaces';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-card-onec',
  templateUrl: './card-onec.component.html',
  styleUrl: './card-onec.component.css',
})
export class CardOneC {
  readonly row = input<CatalogRow | null>(null);
  readonly creating = input(false);
  readonly localPreview = input(false);
  readonly canManage = input(false);
  readonly saved = output<void>();
  readonly selected = output<CardOneCChoice>();
  readonly createRequested = output<CardOneCChoice>();
  readonly candidates = signal<MappingCandidate[]>([]);
  readonly localSnapshot = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly code = signal('');
  readonly units = signal('1');
  readonly candidate = computed(() => {
    const exact = this.candidates().find((c) => c.onec_code === this.code());
    if (exact) return exact;
    const legacy = this.candidates().filter((c) => c.sku_1c === this.code());
    return legacy.length === 1 ? legacy[0] : undefined;
  });
  readonly unitsValue = computed(() => {
    try {
      return mappingUnits(this.units());
    } catch {
      return null;
    }
  });
  readonly sellable = computed(() =>
    this.unitsValue() && this.candidate()
      ? Math.floor(this.candidate()!.available / this.unitsValue()!)
      : null,
  );
  readonly packageCost = computed(
    () =>
      number(this.row()?.package_cost) ??
      (this.candidate()?.selected_cost != null && this.unitsValue()
        ? Number(this.candidate()!.selected_cost) * this.unitsValue()!
        : null),
  );
  readonly money = money;
  private readonly api = inject(CatalogApi);
  private readonly destroy = inject(DestroyRef);
  private requested = false;
  constructor() {
    effect(() => {
      const r = this.row();
      this.code.set(r?.onec_code || r?.sku_1c || '');
      this.units.set(String(r?.units_per_item || 1));
    });
    effect(() => {
      if (this.localPreview() && !this.requested) {
        this.requested = true;
        this.load();
      }
    });
  }
  load() {
    if (!this.localPreview()) return;
    this.localSnapshot.set(false);
    this.loading.set(true);
    this.error.set('');
    this.api
      .mappingSnapshot()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.candidates.set(r.items);
          this.localSnapshot.set(r.local_preview === true);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }
  choose(value: string) {
    this.code.set(value);
    const c = this.candidate(),
      n = this.unitsValue();
    if (c && n)
      this.selected.emit({
        onec_code: c.onec_code || c.sku_1c,
        units_per_item: n,
        name: c.onec_name || c.sku_1c,
      });
  }
  save() {
    if (this.busy() || !this.canManage() || !this.localPreview() || !this.localSnapshot()) return;
    const c = this.candidate(),
      n = this.unitsValue();
    if (!c?.is_verified || !n) {
      this.error.set('Выберите подтверждённый товар 1С и целое количество от 1 до 1 000 000.');
      return;
    }
    const choice = {
      onec_code: c.onec_code || c.sku_1c,
      units_per_item: n,
      name: c.onec_name || c.sku_1c,
    };
    if (this.creating()) {
      this.createRequested.emit(choice);
      return;
    }
    const row = this.row();
    if (!row?.version) {
      this.error.set('Обновите данные товара перед сохранением связи.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .mappingPreview([
        {
          offer_id: row.offer_id,
          identity: choice.onec_code,
          onec_code: choice.onec_code,
          units_per_item: n,
          expected_version: row.version,
        },
      ])
      .pipe(
        switchMap((op) =>
          this.row()?.offer_id === row.offer_id ? this.api.apply(op.operation_id) : EMPTY,
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          if (this.row()?.offer_id === row.offer_id) this.saved.emit();
        },
        error: (e) => {
          this.busy.set(false);
          if (this.row()?.offer_id === row.offer_id) this.error.set(errorMessage(e));
        },
        complete: () => this.busy.set(false),
      });
  }
}
