import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TeamComponent } from './components/profit/team.component';
import { PageModule } from '../../shared/page/page.module';


const routes: Routes = [
  { path: '', component: TeamComponent }
];

@NgModule({
  declarations: [TeamComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class TeamModule { }