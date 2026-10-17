import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'account',
    title: 'Настройки и доступ — Ozon × 1С',
    loadComponent: () => import('./account/account-page').then((m) => m.AccountPage),
  },
  {
    path: 'imports',
    title: 'Импорт таблиц — Ozon × 1С',
    loadComponent: () => import('./imports/imports-page').then((m) => m.ImportsPage),
  },
  {
    path: 'finance',
    title: 'Финансы — Ozon × 1С',
    loadComponent: () => import('./finance/finance-page').then((m) => m.FinancePage),
  },
  {
    path: 'promotions',
    title: 'Акции — Ozon × 1С',
    loadComponent: () => import('./promotions/promotions-page').then((m) => m.PromotionsPage),
  },
  {
    path: 'stocks',
    title: 'Остатки и склады — Ozon × 1С',
    loadComponent: () => import('./stocks/stocks-page').then((m) => m.StocksPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    title: 'Рабочая панель — Ozon × 1С',
    loadComponent: () => import('./workspace/overview-page').then((m) => m.OverviewPage),
  },
  {
    path: 'orders',
    title: 'Заказы — Ozon × 1С',
    data: { entity: 'orders' },
    loadComponent: () => import('./workspace/list-page').then((m) => m.OperationalList),
  },
  {
    path: 'returns',
    title: 'Возвраты — Ozon × 1С',
    data: { entity: 'returns' },
    loadComponent: () => import('./workspace/list-page').then((m) => m.OperationalList),
  },
  {
    path: 'products/create',
    title: 'Новая карточка — Ozon × 1С',
    loadComponent: () => import('./cards/card-page').then((m) => m.CardPage),
  },
  {
    path: 'products/card',
    title: 'Редактор карточки — Ozon × 1С',
    loadComponent: () => import('./cards/card-page').then((m) => m.CardPage),
  },
  {
    path: 'products',
    title: 'Товары — Ozon × 1С',
    data: { mode: 'products' },
    loadComponent: () => import('./catalog/catalog-page').then((m) => m.CatalogPageComponent),
  },
  {
    path: 'mapping',
    title: 'Сопоставление с 1С — Ozon × 1С',
    data: { mode: 'mapping' },
    loadComponent: () => import('./catalog/mapping-page').then((m) => m.MappingPage),
  },
  {
    path: 'pricing',
    title: 'Расчёт цен — Ozon × 1С',
    loadComponent: () => import('./pricing/pricing-page').then((m) => m.PricingPageComponent),
  },
  {
    path: 'pricing/formula',
    title: 'Формула — Ozon × 1С',
    loadComponent: () => import('./pricing/formula-page').then((m) => m.FormulaPage),
  },
  {
    path: 'migration',
    title: 'Этапы переноса — Ozon × 1С',
    loadComponent: () => import('./migration-page').then((m) => m.MigrationPage),
  },
  { path: '**', redirectTo: 'pricing' },
];
