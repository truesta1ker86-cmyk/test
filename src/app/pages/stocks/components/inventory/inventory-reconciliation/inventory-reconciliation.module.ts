import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InventoryReconciliationComponent } from './inventory-reconciliation.component';
import { DataTableModule } from '../../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../../shared/product-preview/directives/product-name.module';
@NgModule({
  declarations: [InventoryReconciliationComponent],
  imports: [CommonModule, RouterLink, DataTableModule, ProductNameModule],
  exports: [InventoryReconciliationComponent],
})
export class InventoryReconciliationModule {}
