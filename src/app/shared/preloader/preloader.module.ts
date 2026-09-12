import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreloaderService } from './infrastructure/services/preloader.service';
import { preloaderInterceptor } from './infrastructure/services/preloader.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { PreloaderComponent } from './components/preloader/preloader.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { SkeletonCardsComponent } from './components/sceletons/skeleton-cards/skeleton-cards.component';
import { SkeletonDashboardComponent } from './components/sceletons/skeleton-dashboard/skeleton-dashboard.component';
import { SkeletonDataTableComponent } from './components/sceletons/skeleton-data-table/skeleton-data-table.component';
import { SkeletonFormComponent } from './components/sceletons/skeleton-form/skeleton-form.component';
import { SkeletonListComponent } from './components/sceletons/skeleton-list/skeleton-list.component';
import { SkeletonTableComponent } from './components/sceletons/skeleton-table/skeleton-table.component';
import { SkeletonTextComponent } from './components/sceletons/skeleton-text/skeleton-text.component';
import { ErrorStateComponent } from './components/error-state/error-state.component';



const SKELETONS = [
    SkeletonTableComponent,
    SkeletonCardsComponent,
    SkeletonListComponent,
    SkeletonFormComponent,
    SkeletonDashboardComponent,
    SkeletonTextComponent,
    SkeletonDataTableComponent
  ];



@NgModule({
  declarations: [
    PreloaderComponent,
    ...SKELETONS,
    ErrorStateComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ProgressSpinnerModule,
    SkeletonModule
  ],
  providers: [
    PreloaderService,
    provideHttpClient(
        withInterceptors([
          preloaderInterceptor,
        ]),
      ),
  ],
  exports: [
    PreloaderComponent,
    ...SKELETONS,
    ErrorStateComponent
  ],
})
export class PreloaderModule {}
