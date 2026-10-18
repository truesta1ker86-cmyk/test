import { FinancePageModule } from './components/finance-page/finance-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FinancePage } from './components/finance-page/finance-page.component';

export const routes: Routes = [{ path: '', component: FinancePage, title: 'Финансы — Ozon × 1С' }];

@NgModule({
  imports: [CommonModule, FinancePageModule, RouterModule.forChild(routes)],
})
export class ProfitModule {}
