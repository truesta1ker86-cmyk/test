import { OrdersPageModule } from './components/orders/orders.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OrdersComponent } from './components/orders/orders.component';

export const routes: Routes = [
  { path: '', component: OrdersComponent, data: { entity: 'orders' }, title: 'Заказы — Ozon × 1С' },
];

@NgModule({
  imports: [CommonModule, OrdersPageModule, RouterModule.forChild(routes)],
})
export class OrdersModule {}
