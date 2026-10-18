import { AccountPageModule } from './components/account-page/account-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AccountPage } from './components/account-page/account-page.component';

export const routes: Routes = [
  { path: '', component: AccountPage, title: 'Настройки и доступ — Ozon × 1С' },
];

@NgModule({
  imports: [CommonModule, AccountPageModule, RouterModule.forChild(routes)],
})
export class TeamModule {}
