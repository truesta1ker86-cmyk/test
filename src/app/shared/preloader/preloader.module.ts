import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreloaderIndicatorModule } from './preloader-indicator.module';
import { SkeletonModule } from 'primeng/skeleton';
import { ErrorStateComponent } from './components/error-state/error-state.component';
import { SKELETONS } from './infrastructure/constants/skeleton.constants';

@NgModule({
  declarations: [...SKELETONS, ErrorStateComponent],
  imports: [CommonModule, FormsModule, PreloaderIndicatorModule, SkeletonModule],
  exports: [PreloaderIndicatorModule, ...SKELETONS, ErrorStateComponent],
})
export class PreloaderModule {}
