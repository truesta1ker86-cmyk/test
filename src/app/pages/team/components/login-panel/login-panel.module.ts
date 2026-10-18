import { NgModule } from '@angular/core';
import { LoginPanel } from './login-panel.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [LoginPanel],
  imports: [FormsModule],
  exports: [LoginPanel],
})
export class LoginPanelModule {}
