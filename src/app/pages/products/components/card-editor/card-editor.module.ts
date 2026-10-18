import { NgModule } from '@angular/core';
import { CardEditor } from './card-editor.component';
import { ProductNameModule } from '../../../../shared/product-preview/directives/product-name.module';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [CardEditor],
  imports: [ProductNameModule, ReactiveFormsModule],
  exports: [CardEditor],
})
export class CardEditorModule {}
