import { NgModule } from '@angular/core';
import { AccountProfile } from './account-profile.component';
import { RouterLink } from '@angular/router';
import { StockAutomationPanelModule } from '../stock-automation/stock-automation.module';

@NgModule({
  declarations: [AccountProfile],
  imports: [RouterLink, StockAutomationPanelModule],
  exports: [AccountProfile],
})
export class AccountProfileModule {}
