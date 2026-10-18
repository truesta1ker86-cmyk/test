import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MigrationPage } from './components/migration-page/migration-page.component';
import { MigrationPageModule } from './components/migration-page/migration-page.module';

@NgModule({
  imports: [MigrationPageModule, RouterModule.forChild([{ path: '', component: MigrationPage }])],
})
export class MigrationModule {}
