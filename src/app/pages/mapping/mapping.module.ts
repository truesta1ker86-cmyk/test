import { MappingPageModule } from './components/mapping-page/mapping-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MappingPage } from './components/mapping-page/mapping-page.component';

export const routes: Routes = [
  {
    path: '',
    component: MappingPage,
    data: { mode: 'mapping' },
    title: 'Сопоставление с 1С — Ozon × 1С',
  },
];

@NgModule({
  imports: [CommonModule, MappingPageModule, RouterModule.forChild(routes)],
})
export class MappingModule {}
