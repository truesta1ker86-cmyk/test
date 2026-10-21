import { CatalogPageModule } from './components/catalog-page/catalog-page.module';
import { CardPageModule } from './components/card-page/card-page.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CatalogPageComponent } from './components/catalog-page/catalog-page.component';
import { CardPage } from './components/card-page/card-page.component';

export const routes: Routes = [
  { path: 'create', component: CardPage, title: 'Новая карточка — Ozon × 1С' },
  { path: 'card', component: CardPage, title: 'Редактор карточки — Ozon × 1С' },
  {
    path: '',
    component: CatalogPageComponent,
    data: { mode: 'products' },
    title: 'Карточки товаров — Ozon × 1С',
  },
];

@NgModule({
  imports: [CommonModule, CatalogPageModule, CardPageModule, RouterModule.forChild(routes)],
})
export class ProductsModule {}
