import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

@Component({
  selector: 'app-allocation-matrix-cell',
  standalone: false,
  templateUrl: './allocation-matrix-cell.component.html',
  styleUrls: ['./allocation-matrix-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationMatrixCellComponent implements OnChanges {
  @Input() product: any;
  @Input() warehouseId!: string;
  @Input() physicalQty: number | null = null;
  @Input() currentOzonQty: number | null = null;
  @Input() mode: 'share' | 'target' = 'share';
  @Input() value: number = 100;
  @Input() quantum: number = 1;
  @Input() isDirty: boolean = false;
  @Input() isEnabled: boolean = true;
  @Input() isSaved: boolean = false;

  @Output() draftChange = new EventEmitter<{
    field: 'mode' | 'value' | 'quantum';
    newValue: any;
  }>();

  displayedQty: number | null = null;
  hasPositivePhysicalQty: boolean = false;
  roundingStep: number = 1;
  percentFieldLabel: string = 'Доля, %';
  percentFieldAriaLabel: string = 'Доля общего остатка 1С, %';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Защита от отсутствия продукта
    if (!this.product) {
      this.displayedQty = null;
      this.hasPositivePhysicalQty = false;
      this.cdr.markForCheck();
      return;
    }

    this.calculateDisplayedQty();
    this.hasPositivePhysicalQty = this.physicalQty !== null && this.physicalQty > 0;
    this.roundingStep = this.quantum || 1;
    this.percentFieldLabel = this.mode === 'target' ? 'От остатка 1С, %' : 'Доля, %';
    this.percentFieldAriaLabel =
      this.mode === 'target'
        ? 'Фиктивный остаток, % от физического остатка 1С'
        : 'Доля общего остатка 1С, %';
    this.cdr.markForCheck();
  }

  private calculateDisplayedQty(): void {
    if (this.physicalQty === null || this.physicalQty === undefined) {
      this.displayedQty = null;
      return;
    }
    if (this.mode === 'target') {
      this.displayedQty = this.value;
    } else {
      const sharePercent = this.value / 100;
      const quantum = this.quantum || 1;
      const raw = this.physicalQty * sharePercent;
      this.displayedQty = Math.floor(raw / quantum) * quantum;
    }
  }

  onModeChange(event: Event): void {
    const newMode = (event.target as HTMLSelectElement).value as 'share' | 'target';
    this.draftChange.emit({ field: 'mode', newValue: newMode });
  }

  onValueChange(event: Event): void {
    const newValue = (event.target as HTMLInputElement).value;
    this.draftChange.emit({ field: 'value', newValue: Number(newValue) });
  }

  onQuantumChange(event: Event): void {
    const newQuantum = (event.target as HTMLInputElement).value;
    this.draftChange.emit({ field: 'quantum', newValue: Number(newQuantum) || 1 });
  }
}
