import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-allocation-settings',
  standalone: false,
  templateUrl: './allocation-settings.component.html',
  styleUrls: ['./allocation-settings.component.scss'],
})
export class AllocationSettingsComponent {
  @Input() warehouses: any[] = [];
  @Input() selectedWarehouses: string[] = [];
  @Output() warehousesChange = new EventEmitter<string[]>();

  globalShare = 100;

  // Добавить склад
  addWarehouse(warehouseId: string): void {
    if (!warehouseId) return;
    if (!this.selectedWarehouses.includes(warehouseId) && this.selectedWarehouses.length < 12) {
      this.selectedWarehouses.push(warehouseId);
      this.warehousesChange.emit(this.selectedWarehouses);
    }
  }

  // Удалить склад
  removeWarehouse(warehouseId: string): void {
    this.selectedWarehouses = this.selectedWarehouses.filter(id => id !== warehouseId);
    this.warehousesChange.emit(this.selectedWarehouses);
  }

  // ✅ Получить название склада по ID
  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses.find(w => w.warehouse_id === warehouseId);
    return warehouse?.warehouse_name || warehouseId;
  }

  // Применить глобальную долю
  applyGlobalShare(): void {
    // Можно эмиттить событие для родителя, чтобы применить ко всем товарам
    this.warehousesChange.emit(this.selectedWarehouses);
  }
}
