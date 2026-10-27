import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { DatePickerModule } from 'primeng/datepicker';
import { ModalFocusModule } from '../directives/modal-focus/modal-focus.module';
import { IconModule } from '../icons-sprite/icon/icon.module';
import { PeriodPickerComponent } from './components/period-picker/period-picker.component';

@NgModule({
  declarations: [PeriodPickerComponent],
  imports: [CommonModule, FormsModule, DatePickerModule, ModalFocusModule, IconModule],
  exports: [PeriodPickerComponent],
})
export class PeriodPickerModule {}
