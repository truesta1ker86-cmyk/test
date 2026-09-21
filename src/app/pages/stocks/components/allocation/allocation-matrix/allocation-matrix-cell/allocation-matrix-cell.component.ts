import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  DraftChangeEvent,
  ProductEntity,
} from '../../../../infrastructure/models/allocation-matrix.types';

@Component({
  selector: 'app-allocation-matrix-cell',
  standalone: false,
  templateUrl: './allocation-matrix-cell.component.html',
  styleUrls: ['./allocation-matrix-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationMatrixCellComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ────────────────────────────────────────────────
  readonly product = input<ProductEntity | null>(null);
  readonly warehouseId = input.required<string>();
  readonly physicalQty = input<number | null>(null);
  readonly currentOzonQty = input<number | null>(null);

  readonly mode = input<'share' | 'target'>('share');
  readonly value = input<number>(100);
  readonly quantum = input<number>(1);
  readonly isDirty = input<boolean>(false);
  readonly isEnabled = input<boolean>(true);
  readonly isSaved = input<boolean>(false);

  readonly draftChange = output<DraftChangeEvent>();

  // ─── Локальные сигналы ─────────────────────────────────────
  private readonly _percent = signal<number>(100);
  readonly localPercent = this._percent.asReadonly();

  private readonly _quantum = signal<number>(1);
  readonly localQuantum = this._quantum.asReadonly();

  private readonly valueChange$ = new Subject<number>();

  private userEditing = false;
  private userEditingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (!this.userEditing) this._percent.set(this.value());
    });

    effect(() => {
      if (!this.userEditing) this._quantum.set(this.quantum());
    });

    this.valueChange$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((value) => {
      this.userEditing = false;
      this.draftChange.emit({ field: 'value', newValue: value });
    });

    afterNextRender(() => this.syncFromInputs());
  }

  ngOnInit(): void {
    this.syncFromInputs();
  }

  private syncFromInputs(): void {
    this.userEditing = false;

    const incomingPercent = this.value();
    const incomingQuantum = this.quantum();

    if (Number.isFinite(incomingPercent)) {
      this._percent.set(incomingPercent);
    }
    if (Number.isFinite(incomingQuantum) && incomingQuantum > 0) {
      this._quantum.set(incomingQuantum);
    }
  }

  ngOnDestroy(): void {
    if (this.userEditingTimer !== null) clearTimeout(this.userEditingTimer);
  }

  // ─── Физический остаток ────────────────────────────────────
  readonly hasPhysicalSnapshot = computed<boolean>(() => {
    const raw = this.physicalQty();
    return raw !== null && raw !== undefined && Number.isFinite(Number(raw));
  });

  readonly physicalQtyValue = computed<number>(() =>
    this.hasPhysicalSnapshot() ? Number(this.physicalQty()) : 0,
  );

  readonly hasPositivePhysicalQty = computed(() => this.physicalQtyValue() > 0);

  readonly roundingStep = computed(() =>
    Math.max(1, Number(this._quantum()) || 1),
  );

  readonly percentFieldLabel = computed(() =>
    this.mode() === 'target' ? 'Количество' : 'Доля от остатка 1С, %',
  );

  readonly percentFieldAriaLabel = computed(() =>
    this.mode() === 'target'
      ? 'Количество к показу'
      : 'Доля от физического остатка 1С, %',
  );

  // ─── Расчёты ───────────────────────────────────────────────
  readonly displayedQty = computed<number | null>(() => {
    const mode = this.mode();
    const percent = this._percent();
    const step = this.roundingStep();

    if (mode === 'target') {
      return Math.max(0, Math.floor(percent) || 0);
    }

    if (!this.hasPhysicalSnapshot()) return null;

    const physical = this.physicalQtyValue();
    if (physical <= 0) return 0;

    const beforeRounding = Math.floor(physical * percent / 100 + 1e-9);
    return Math.floor(beforeRounding / step) * step;
  });

  readonly remainingAfter = computed<number | null>(() => {
    if (this.mode() !== 'share') return null;
    if (!this.hasPhysicalSnapshot()) return null;

    const physical = this.physicalQtyValue();
    const displayed = this.displayedQty();
    if (displayed == null) return null;

    return Math.max(0, physical - displayed);
  });

  readonly currentOzonQtyComputed = computed<number | null>(() => {
    const percent = this._percent();
    const displayed = this.displayedQty();

    if (!Number.isFinite(percent) || percent <= 0) return null;
    if (displayed == null) return null;

    return (displayed * 100) / percent;
  });

  // ─── Обработчики ───────────────────────────────────────────

  /**
   * ⭐ Смена режима с конвертацией значения.
   */
  onModeChange(event: Event): void {
    const newMode = (event.target as HTMLSelectElement).value as 'share' | 'target';
    const oldMode = this.mode();

    if (newMode === oldMode) return;

    const physical = this.physicalQtyValue();
    const hasPhysical = this.hasPhysicalSnapshot() && physical > 0;

    if (newMode === 'target') {
      // share → target: percent → quantity
      const currentPercent = this._percent();
      const step = this.roundingStep();

      let quantity: number;

      if (hasPhysical) {
        const beforeRounding = Math.floor(physical * currentPercent / 100 + 1e-9);
        quantity = Math.floor(beforeRounding / step) * step;
      } else {
        quantity = Math.max(0, Math.floor(currentPercent) || 0);
      }

      this._percent.set(quantity);

    } else {
      // target → share: quantity → percent
      const currentQuantity = this._percent();

      let percent: number;

      if (hasPhysical) {
        percent = (currentQuantity * 100) / physical;
        percent = Math.max(0, Math.min(100, percent));
      } else {
        percent = Math.max(0, Math.min(100, currentQuantity));
      }

      this._percent.set(percent);
    }

    this.markUserEditing();

    this.draftChange.emit({ field: 'mode', newValue: newMode });
    this.valueChange$.next(this._percent());
  }

  onPercentChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const percent = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(percent)) return;

    this.markUserEditing();
    this._percent.set(percent);
    this.valueChange$.next(percent);
  }

  onDisplayedQtyChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;

    if (this.mode() === 'target') {
      this.onPercentChange(event);
      return;
    }

    const displayed = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(displayed)) return;

    this.markUserEditing();

    if (!this.hasPhysicalSnapshot()) return;

    const physical = this.physicalQtyValue();
    if (physical <= 0) return;

    const percent = (displayed * 100) / physical;
    this._percent.set(percent);
    this.valueChange$.next(percent);
  }

  onQuantumChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = Math.max(1, Number(raw) || 1);

    this.markUserEditing();
    this._quantum.set(value);
    this.draftChange.emit({ field: 'quantum', newValue: value });
  }

  private markUserEditing(): void {
    this.userEditing = true;
    if (this.userEditingTimer !== null) clearTimeout(this.userEditingTimer);
    this.userEditingTimer = setTimeout(() => {
      this.userEditing = false;
    }, 400);
  }
}
