import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { DataTableComponent } from './components/data-table/data-table.component';

@NgModule({
  declarations: [DataTableComponent],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CheckboxModule,
    TooltipModule,
  ],
  exports: [DataTableComponent],
})
export class DataTableModule {}