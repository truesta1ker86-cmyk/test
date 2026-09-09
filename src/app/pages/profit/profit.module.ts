import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ProfitComponent } from './components/profit/profit.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: ProfitComponent }
];

@NgModule({
  declarations: [ProfitComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ProfitModule { }