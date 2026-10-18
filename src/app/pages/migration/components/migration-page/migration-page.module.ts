import { NgModule } from '@angular/core';
import { MigrationPage } from './migration-page.component';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [MigrationPage],
  imports: [RouterLink],
  exports: [MigrationPage],
})
export class MigrationPageModule {}
