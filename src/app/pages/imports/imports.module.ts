import { ImportsPageModule } from './components/imports-page/imports-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ImportsPage } from './components/imports-page/imports-page.component';

export const routes: Routes = [
  { path: '', component: ImportsPage, title: 'Импорт таблиц — Ozon × 1С' },
];

@NgModule({
  imports: [CommonModule, ImportsPageModule, RouterModule.forChild(routes)],
})
export class ImportsModule {}
