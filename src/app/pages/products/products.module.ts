import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ProductsComponent } from './components/products/products.component';
import { ProgressModule } from '../../shared/progress/progress.module';
import { ProgressSpinnerModule } from 'primeng/progressspinner';


const routes: Routes = [
  { path: '', component: ProductsComponent }
];

@NgModule({
  declarations: [ProductsComponent],
  imports: [
    CommonModule,
    ProgressModule,
    ProgressSpinnerModule,
    RouterModule.forChild(routes)
  ]
})
export class ProductsModule { }