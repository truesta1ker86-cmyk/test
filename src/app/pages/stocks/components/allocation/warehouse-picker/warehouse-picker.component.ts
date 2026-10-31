import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ElementRef,
  effect,
  viewChild,
} from '@angular/core';
import type { StockWarehouse } from '../../../infrastructure/interfaces/contracts.interfaces';
import { FilterService } from '../../../../../shared/directives/filter-panel/infrastructure/services/filter.service';

@Component({
  selector: 'app-warehouse-picker',
  standalone: false,
  templateUrl: './warehouse-picker.component.html',
  styleUrls: ['./warehouse-picker.component.css'],
  providers: [FilterService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehousePickerComponent implements OnChanges {
  @Input() warehouses: StockWarehouse[] = [];
  @Input() selectedWarehouseIds: string[] = [];
  @Output() warehousesChange = new EventEmitter<string[]>();

  @Input() disabled = false;
  popoverOpen = false;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('warehouseDialog');
  private readonly showDialog = effect(() => {
    const dialog = this.dialog()?.nativeElement;
    if (dialog?.isConnected && !dialog.open) dialog.showModal();
  });
  readonly filters = inject(FilterService);
  get tempSelected(): string[] {
    return this.filters.getValue('warehouses') || this.selectedWarehouseIds;
  }
  set tempSelected(value: string[]) {
    this.filters.updateFilters({ warehouses: value });
  }
  warehouseOptions() {
    const full = this.tempSelected.length >= 12;
    return this.warehouses.map((w) => ({
      value: w.warehouse_id,
      label: w.warehouse_name + ' · ' + this.getWarehouseScheme(w.warehouse_id),
      disabled:
        this.disabled ||
        (w.available === false &&
          !this.isWarehouseAdded(w.warehouse_id) &&
          !this.isWarehouseSelected(w.warehouse_id)) ||
        (full && !this.isWarehouseSelected(w.warehouse_id)),
    }));
  }
  private validSelection(ids: string[]): string[] {
    return [...new Set(ids)]
      .filter((id) =>
        this.warehouses.some(
          (w) => w.warehouse_id === id && (w.available !== false || this.isWarehouseAdded(id)),
        ),
      )
      .slice(0, 12);
  }
  selectionChanged(ids: string[]) {
    if (this.disabled) return;
    this.tempSelected = this.validSelection(ids);
  }

  constructor(private cdr: ChangeDetectorRef) {
    this.filters.setConfigs([
      { key: 'warehouses', label: 'Склады маркетплейса', type: 'multiselect', order: 0 },
    ]);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['warehouses'] || changes['selectedWarehouseIds']) {
      if (this.popoverOpen) {
        this.tempSelected = [...this.selectedWarehouseIds];
      }
      this.cdr.markForCheck();
    }
  }

  get hasWarehouses(): boolean {
    return this.warehouses.length > 0;
  }
  get hasChanges(): boolean {
    const next = this.validSelection(this.tempSelected);
    return (
      next.length !== this.selectedWarehouseIds.length ||
      next.some((id) => !this.selectedWarehouseIds.includes(id))
    );
  }
  get triggerLabel(): string {
    return this.hasWarehouses ? 'Склады в таблице' : 'Нет активных складов';
  }
  get triggerMeta(): string {
    return `${this.selectedWarehouseIds.length} из ${this.warehouses.length}`;
  }
  get statusText(): string {
    if (this.disabled) return 'Завершается операция. Пока можно просмотреть склады.';
    return `Выбрано: ${this.tempSelected.length} · максимум 12`;
  }

  togglePopover(): void {
    if (!this.hasWarehouses) {
      return;
    }
    if (!this.popoverOpen) {
      this.tempSelected = [...this.selectedWarehouseIds];
    }
    this.popoverOpen = !this.popoverOpen;
    this.cdr.markForCheck();
  }

  closePopover(): void {
    this.tempSelected = [...this.selectedWarehouseIds];
    this.popoverOpen = false;
    this.cdr.markForCheck();
  }

  toggleWarehouseSelection(warehouseId: string, checked: boolean): void {
    if (this.disabled) return;
    this.selectionChanged(
      checked
        ? [...this.tempSelected, warehouseId]
        : this.tempSelected.filter((id) => id !== warehouseId),
    );
    this.cdr.markForCheck();
  }

  applySelection(): void {
    if (this.disabled) return;
    const next = this.validSelection(this.tempSelected);
    if (this.hasChanges) this.warehousesChange.emit(next);
    this.closePopover();
  }

  isWarehouseSelected(warehouseId: string): boolean {
    return this.tempSelected.includes(warehouseId);
  }

  isWarehouseAdded(warehouseId: string): boolean {
    return this.selectedWarehouseIds.includes(warehouseId);
  }

  getWarehouseName(warehouseId: string): string {
    const w = this.warehouses?.find((item) => item.warehouse_id === warehouseId);
    return w?.warehouse_name || warehouseId;
  }

  getWarehouseScheme(warehouseId: string): string {
    const w = this.warehouses?.find((item) => item.warehouse_id === warehouseId);
    return w?.is_rfbs ? 'rFBS' : 'FBS';
  }
}
