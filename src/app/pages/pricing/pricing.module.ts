import { PricingPageModule } from './components/pricing-page/pricing-page.module';
import { FormulaPageModule } from './components/formula-page/formula-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PricingPageComponent } from './components/pricing-page/pricing-page.component';
import { FormulaPage } from './components/formula-page/formula-page.component';

export const routes: Routes = [
  { path: 'formula', component: FormulaPage, title: 'Формула — Ozon × 1С' },
  { path: '', component: PricingPageComponent, title: 'Расчёт цен — Ozon × 1С' },
];

@NgModule({
  imports: [CommonModule, PricingPageModule, FormulaPageModule, RouterModule.forChild(routes)],
})
export class PricingModule {}
