import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReturnsComponent } from './components/returns/returns.component';
import { ReturnListComponent } from './components/return-list/return-list.component';
import { DataTableModule } from '../../shared/data-table/data-table.module';
import { DataTableFilterModule } from '../../shared/data-table-filter/data-table-filter.module';
import { ProductNameModule } from '../../shared/product-preview/directives/product-name.module';
import { IconModule } from '../../shared/icons-sprite/icon/icon.module';

export const routes: Routes = [
  {
    path: '',
    component: ReturnsComponent,
    title: 'Возвраты — Ozon × 1С',
  },
];

@NgModule({
  declarations: [ReturnsComponent, ReturnListComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DataTableModule,
    DataTableFilterModule,
    ProductNameModule,
    IconModule,
  ],
})
export class ReturnsModule {}
