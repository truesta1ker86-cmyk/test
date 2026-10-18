import { NgModule } from '@angular/core';
import { BulkEditor } from './bulk-editor.component';
import { DataTableModule } from '../../../../shared/data-table/data-table.module';
import { ReactiveFormsModule } from '@angular/forms';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [BulkEditor],
  imports: [DataTableModule, ReactiveFormsModule, IconModule],
  exports: [BulkEditor],
})
export class BulkEditorModule {}
