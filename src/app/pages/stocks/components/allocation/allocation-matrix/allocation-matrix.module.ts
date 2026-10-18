import { NgModule } from '@angular/core';
import { AllocationMatrixComponent } from './allocation-matrix.component';
import { DataTableModule } from '../../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WarehousePickerModule } from '../warehouse-picker/warehouse-picker.module';
import { ProductNameModule } from '../../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [AllocationMatrixComponent],
  imports: [DataTableModule, FormsModule, RouterLink, WarehousePickerModule, ProductNameModule],
  exports: [AllocationMatrixComponent],
})
export class AllocationMatrixModule {}
