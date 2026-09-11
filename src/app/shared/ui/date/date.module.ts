import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { DateComponent } from './components/date/date.component';

@NgModule({
  declarations: [DateComponent],
  imports: [CommonModule, FormsModule, DatePickerModule],
  exports: [DateComponent],
})
export class DateComponentModule {}
