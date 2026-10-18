import { NgModule } from '@angular/core';
import { StockAutomationPanel } from './stock-automation.component';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';

@NgModule({
  declarations: [StockAutomationPanel],
  imports: [FormsModule, RouterLink, ModalFocusModule],
  exports: [StockAutomationPanel],
})
export class StockAutomationPanelModule {}
