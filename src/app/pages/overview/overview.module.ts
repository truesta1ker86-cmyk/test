import { OverviewPageModule } from './components/overview-page/overview-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OverviewPage } from './components/overview-page/overview-page.component';

export const routes: Routes = [
  { path: '', component: OverviewPage, title: 'Рабочая панель — Ozon × 1С' },
];

@NgModule({
  imports: [CommonModule, OverviewPageModule, RouterModule.forChild(routes)],
})
export class OverviewModule {}
