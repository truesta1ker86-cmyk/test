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
      label:
        w.warehouse_name +
        ' · ' +
        this.getWarehouseScheme(w.warehouse_id) +
        (this.isWarehouseAdded(w.warehouse_id) ? ' · Уже добавлен' : ''),
      disabled:
        this.disabled ||
        this.isWarehouseAdded(w.warehouse_id) ||
        w.available === false ||
        (full && !this.isWarehouseSelected(w.warehouse_id)),
    }));
  }
  selectionChanged(ids: string[]) {
    this.tempSelected = [
      ...this.selectedWarehouseIds,
      ...ids.filter(
        (id) =>
          !this.isWarehouseAdded(id) &&
          this.warehouses.some((w) => w.warehouse_id === id && w.available !== false),
      ),
    ].slice(0, 12);
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

  get addedCount(): number {
    return this.selectedWarehouseIds.length;
  }

  get selectedCount(): number {
    return this.tempSelected.filter((id) => !this.selectedWarehouseIds.includes(id)).length;
  }

  get canAddMore(): boolean {
    return this.selectedWarehouseIds.length < 12;
  }

  get hasWarehouses(): boolean {
    return this.warehouses && this.warehouses.length > 0;
  }

  get triggerLabel(): string {
    if (!this.hasWarehouses) {
      return 'Нет активных складов';
    }
    if (this.selectedCount > 0) {
      return `Выбрано новых складов: ${this.selectedCount}`;
    }
    if (this.addedCount >= 12 && this.addedCount < this.warehouses.length) {
      return 'Достигнут лимит складов';
    }
    if (this.addedCount >= this.warehouses.length) {
      return 'Все склады уже добавлены';
    }
    return 'Выберите склады';
  }

  get triggerMeta(): string {
    if (!this.hasWarehouses) {
      return '';
    }
    if (this.selectedCount > 0) {
      return `${this.addedCount} добавлено`;
    }
    if (this.addedCount >= 12 && this.addedCount < this.warehouses.length) {
      return '12 из 12';
    }
    if (this.addedCount >= this.warehouses.length) {
      return `${this.addedCount} из ${this.warehouses.length}`;
    }
    return `${this.addedCount} добавлено`;
  }

  get statusText(): string {
    if (!this.hasWarehouses) {
      return 'Список складов пуст';
    }
    if (this.selectedCount > 0) {
      return `Выбрано: ${this.selectedCount} · уже в таблице: ${this.addedCount}`;
    }
    if (this.addedCount >= 12 && this.addedCount < this.warehouses.length) {
      return 'В таблице уже находятся максимально доступные 12 складов';
    }
    if (this.addedCount >= this.warehouses.length) {
      return `Все ${this.addedCount} складов уже находятся в таблице`;
    }
    return `Добавлено: ${this.addedCount} · доступно: ${this.warehouses.length - this.addedCount}`;
  }

  get isAddButtonDisabled(): boolean {
    return (
      !this.hasWarehouses ||
      !this.canAddMore ||
      this.tempSelected.every((id) => this.selectedWarehouseIds.includes(id))
    );
  }

  togglePopover(): void {
    if (!this.hasWarehouses || this.disabled) {
      return;
    }
    if (!this.popoverOpen) {
      this.tempSelected = [...this.selectedWarehouseIds];
    }
    this.popoverOpen = !this.popoverOpen;
    this.cdr.markForCheck();
  }

  closePopover(): void {
    this.popoverOpen = false;
    this.cdr.markForCheck();
  }

  toggleWarehouseSelection(warehouseId: string, checked: boolean): void {
    if (
      this.disabled ||
      this.isWarehouseAdded(warehouseId) ||
      !this.warehouses.some((w) => w.warehouse_id === warehouseId && w.available !== false)
    )
      return;
    if (checked) {
      if (!this.tempSelected.includes(warehouseId) && this.tempSelected.length < 12) {
        this.tempSelected = [...this.tempSelected, warehouseId];
      }
    } else {
      this.tempSelected = this.tempSelected.filter((id) => id !== warehouseId);
    }
    this.cdr.markForCheck();
  }

  addSelectedWarehouses(): void {
    if (this.disabled) return;
    const newIds = this.tempSelected.filter(
      (id) =>
        !this.selectedWarehouseIds.includes(id) &&
        this.warehouses.some((w) => w.warehouse_id === id && w.available !== false),
    );
    if (this.selectedWarehouseIds.length + newIds.length > 12) return;
    if (newIds.length) {
      this.warehousesChange.emit([...this.selectedWarehouseIds, ...newIds]);
    }
    this.tempSelected = [...this.selectedWarehouseIds];
    this.closePopover();
    this.cdr.markForCheck();
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
