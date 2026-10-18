import { NgModule } from '@angular/core';
import { FormulaPage } from './formula-page.component';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [FormulaPage],
  imports: [RouterLink, ReactiveFormsModule],
  exports: [FormulaPage],
})
export class FormulaPageModule {}
