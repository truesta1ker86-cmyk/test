import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReturnsComponent } from './components/returns/returns.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: ReturnsComponent }
];

@NgModule({
  declarations: [ReturnsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ReturnsModule { }