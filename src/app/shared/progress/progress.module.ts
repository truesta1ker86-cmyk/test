import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconsSpriteModule } from '../icons-sprite/icons-sprite.module';
import { NavigationModule } from '../navigation/navigation.module';
import { ProgressComponent } from './components/progress/progress.component';
import { ScanService } from './infrastructure/services/scan.service';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SliderModule }      from 'primeng/slider';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';





@NgModule({
  declarations: [
    ProgressComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SliderModule,
    CheckboxModule,
    IconsSpriteModule,
    NavigationModule,
    ButtonModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    TagModule,  
  ],
  exports: [
    ProgressComponent
  ],
  providers: [
    ScanService
  ]
  
})
export class ProgressModule { }