import { OrdersPageModule } from '../orders/components/orders/orders.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OrdersComponent } from '../orders/components/orders/orders.component';

export const routes: Routes = [
  {
    path: '',
    component: OrdersComponent,
    data: { entity: 'returns' },
    title: 'Возвраты — Ozon × 1С',
  },
];

@NgModule({
  imports: [CommonModule, OrdersPageModule, RouterModule.forChild(routes)],
})
export class ReturnsModule {}
