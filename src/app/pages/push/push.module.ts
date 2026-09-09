import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PushComponent } from './components/push/push.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: PushComponent }
];

@NgModule({
  declarations: [PushComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class PushModule { }