import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { BillingComponent } from './components/billing/billing.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: BillingComponent }
];

@NgModule({
  declarations: [BillingComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class BillingModule { }