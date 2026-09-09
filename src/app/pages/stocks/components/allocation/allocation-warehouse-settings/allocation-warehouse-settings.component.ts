import { Component, Input, Output, EventEmitter } from '@angular/core';
import { WarehouseSettings } from '../../../infrastructure/models/stock.model';

@Component({
  selector: 'app-allocation-warehouse-settings',
  standalone: false,
  templateUrl: './allocation-warehouse-settings.component.html',
  styleUrls: ['./allocation-warehouse-settings.component.scss'],
})
export class AllocationWarehouseSettingsComponent {
  @Input() warehouses: any[] = [];
  @Input() selectedWarehouses: string[] = [];
  @Input() settings: WarehouseSettings[] = [];
  @Output() warehousesChange = new EventEmitter<string[]>();
  @Output() settingsChange = new EventEmitter<WarehouseSettings[]>();
  @Output() globalShareApply = new EventEmitter<number>();
  @Output() applyToSelected = new EventEmitter<{
    warehouseId: string;
    settings: WarehouseSettings;
  }>();

  globalShare = 100;

  getWarehouseName(id: string): string {
    const w = this.warehouses.find((item) => item.warehouse_id === id);
    return w?.warehouse_name || id;
  }

  getWarehouseType(id: string): string {
    const w = this.warehouses.find((item) => item.warehouse_id === id);
    return w?.is_rfbs ? 'rFBS' : 'FBS';
  }

  removeWarehouse(id: string): void {
    this.selectedWarehouses = this.selectedWarehouses.filter((w) => w !== id);
    this.warehousesChange.emit(this.selectedWarehouses);
  }

  applyGlobalShare(): void {
    this.globalShareApply.emit(this.globalShare);
  }

  applyToSelectedWarehouse(id: string): void {
    const setting = this.settings.find((s) => s.warehouse_id === id);
    if (setting) {
      this.applyToSelected.emit({ warehouseId: id, settings: { ...setting } });
    }
  }
}
