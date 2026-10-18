import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreloaderComponent } from './components/preloader/preloader.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { ErrorStateComponent } from './components/error-state/error-state.component';
import { SKELETONS } from './infrastructure/constants/skeleton.constants';

@NgModule({
  declarations: [PreloaderComponent, ...SKELETONS, ErrorStateComponent],
  imports: [CommonModule, FormsModule, ProgressSpinnerModule, SkeletonModule],
  exports: [PreloaderComponent, ...SKELETONS, ErrorStateComponent],
})
export class PreloaderModule {}
