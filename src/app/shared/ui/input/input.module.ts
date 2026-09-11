import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputComponent } from './components/input/input.component';


@NgModule({
  declarations: [InputComponent],
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
  ],
  exports: [InputComponent],
})
export class InputModule {}