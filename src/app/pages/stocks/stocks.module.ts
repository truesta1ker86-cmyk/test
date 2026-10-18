import { StocksPageModule } from './components/stocks-page/stocks-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { StocksPage } from './components/stocks-page/stocks-page.component';

export const routes: Routes = [
  { path: '', component: StocksPage, title: 'Остатки и склады — Ozon × 1С' },
  { path: 'inventory', redirectTo: '/stocks?tab=reconciliation' },
  { path: 'allocation', redirectTo: '/stocks?tab=matrix' },
];

@NgModule({
  imports: [CommonModule, StocksPageModule, RouterModule.forChild(routes)],
})
export class StocksModule {}
