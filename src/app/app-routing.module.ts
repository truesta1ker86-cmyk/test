import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    loadChildren: () => import('./pages/overview/overview.module').then((m) => m.OverviewModule),
  },
  {
    path: 'orders',
    loadChildren: () => import('./pages/orders/orders.module').then((m) => m.OrdersModule),
  },
  {
    path: 'stocks',
    loadChildren: () => import('./pages/stocks/stocks.module').then((m) => m.StocksModule),
  },
  {
    path: 'returns',
    loadChildren: () => import('./pages/returns/returns.module').then((m) => m.ReturnsModule),
  },
  {
    path: 'finance',
    loadChildren: () => import('./pages/profit/profit.module').then((m) => m.ProfitModule),
  },
  {
    path: 'products',
    loadChildren: () => import('./pages/products/products.module').then((m) => m.ProductsModule),
  },
  {
    path: 'pricing',
    loadChildren: () => import('./pages/pricing/pricing.module').then((m) => m.PricingModule),
  },
  {
    path: 'imports',
    loadChildren: () => import('./pages/imports/imports.module').then((m) => m.ImportsModule),
  },
  {
    path: 'mapping',
    loadChildren: () => import('./pages/mapping/mapping.module').then((m) => m.MappingModule),
  },
  {
    path: 'promotions',
    loadChildren: () => import('./pages/push/push.module').then((m) => m.PushModule),
  },
  {
    path: 'account',
    loadChildren: () => import('./pages/team/team.module').then((m) => m.TeamModule),
  },
  { path: 'profit', redirectTo: 'finance' },
  { path: 'push', redirectTo: 'promotions' },
  { path: 'billing', redirectTo: 'account' },
  { path: 'team', redirectTo: 'account' },
  {
    path: 'migration',
    loadChildren: () => import('./pages/migration/migration.module').then((m) => m.MigrationModule),
    title: 'Этапы переноса — Ozon × 1С',
  },
  {
    path: '**',
    redirectTo: 'overview',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
