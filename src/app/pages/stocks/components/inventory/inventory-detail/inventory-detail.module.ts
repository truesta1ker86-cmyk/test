import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InventoryDetailComponent } from './inventory-detail.component';
import { DataTableModule } from '../../../../../shared/data-table/data-table.module';
import { ProductNameModule } from '../../../../../shared/product-preview/directives/product-name.module';
@NgModule({
  declarations: [InventoryDetailComponent],
  imports: [CommonModule, RouterLink, DataTableModule, ProductNameModule],
  exports: [InventoryDetailComponent],
})
export class InventoryDetailModule {}
