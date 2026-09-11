import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule as PrimeSelectModule } from 'primeng/select';
import { SelectComponent } from './components/select/select.component';


@NgModule({
  declarations: [SelectComponent],
  imports: [
    CommonModule,
    FormsModule,
    PrimeSelectModule,
  ],
  exports: [SelectComponent],
})
export class SelectComponentModule {}
