import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MappingComponent } from './components/mapping/mapping.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: MappingComponent }
];

@NgModule({
  declarations: [MappingComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class MappingModule { }