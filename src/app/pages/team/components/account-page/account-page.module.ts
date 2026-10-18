import { NgModule } from '@angular/core';
import { AccountPage } from './account-page.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { FormsModule } from '@angular/forms';
import { ModalFocusModule } from '../../../../shared/directives/modal-focus/modal-focus.module';
import { AccountProfileModule } from '../account-profile/account-profile.module';

@NgModule({
  declarations: [AccountPage],
  imports: [DataTableModule, FormsModule, ModalFocusModule, AccountProfileModule],
  exports: [AccountPage],
})
export class AccountPageModule {}
