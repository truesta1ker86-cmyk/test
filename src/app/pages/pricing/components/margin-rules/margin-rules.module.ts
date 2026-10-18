import { NgModule } from '@angular/core';
import { MarginRules } from './margin-rules.component';
import { ReactiveFormsModule } from '@angular/forms';
import { BulkEditorModule } from '../bulk-editor/bulk-editor.module';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [MarginRules],
  imports: [ReactiveFormsModule, BulkEditorModule, IconModule],
  exports: [MarginRules],
})
export class MarginRulesModule {}
