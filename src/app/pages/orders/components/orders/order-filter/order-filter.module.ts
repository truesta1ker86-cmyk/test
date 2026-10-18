import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderFilterComponent } from './order-filter.component';
import { FormsModule } from '@angular/forms';
import { FilterPanelModule } from '../../../../../shared/directives/filter-panel/filter-panel.module';
@NgModule({
  declarations: [OrderFilterComponent],
  imports: [CommonModule, FormsModule, FilterPanelModule],
  exports: [OrderFilterComponent],
})
export class OrderFilterModule {}
