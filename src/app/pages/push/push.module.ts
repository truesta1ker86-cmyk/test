import { PromotionsPageModule } from './components/promotions-page/promotions-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PromotionsPage } from './components/promotions-page/promotions-page.component';

export const routes: Routes = [{ path: '', component: PromotionsPage, title: 'Акции — Ozon × 1С' }];

@NgModule({
  imports: [CommonModule, PromotionsPageModule, RouterModule.forChild(routes)],
})
export class PushModule {}
