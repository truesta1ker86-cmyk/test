import { NgModule } from '@angular/core';
import { PromotionModelEditor } from './model-editor.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [PromotionModelEditor],
  imports: [FormsModule],
  exports: [PromotionModelEditor],
})
export class PromotionModelEditorModule {}
