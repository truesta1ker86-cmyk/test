import { NgModule } from '@angular/core';
import { PriceEditor } from './price-editor.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [PriceEditor],
  imports: [ReactiveFormsModule, IconModule],
  exports: [PriceEditor],
})
export class PriceEditorModule {}
