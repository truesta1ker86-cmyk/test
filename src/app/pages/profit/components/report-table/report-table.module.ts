import { ColumnFilterModule } from '../../../../shared/directives/filter-panel/components/column-filter/column-filter.module';
import { NgModule } from '@angular/core';
import { ReportTable } from './report-table.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { RouterLink } from '@angular/router';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';
import { NgTemplateOutlet } from '@angular/common';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';

@NgModule({
  declarations: [ReportTable],
  imports: [
    DataTableModule,
    RouterLink,
    IconModule,
    NgTemplateOutlet,
    ColumnFilterModule,
    ProductNameModule,
  ],
  exports: [ReportTable],
})
export class ReportTableModule {}
