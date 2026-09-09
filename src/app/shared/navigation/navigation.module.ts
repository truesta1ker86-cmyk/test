import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationComponent } from './navigation/navigation.component';
import { RouterLink, RouterLinkActive } from '@angular/router';



@NgModule({
  declarations: [
    NavigationComponent
  ],
  imports: [
    CommonModule, 
    RouterLink, 
    RouterLinkActive    
  ],
  exports: [
    NavigationComponent
  ]
})
export class NavigationModule { }
