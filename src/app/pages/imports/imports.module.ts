import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ImportsComponent } from './components/imports/imports.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: ImportsComponent }
];

@NgModule({
  declarations: [ImportsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ImportsModule { }