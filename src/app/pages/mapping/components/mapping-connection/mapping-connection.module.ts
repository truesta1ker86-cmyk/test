import { NgModule } from '@angular/core';
import { MappingConnection } from './mapping-connection.component';
import { FormsModule } from '@angular/forms';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [MappingConnection],
  imports: [FormsModule, IconModule],
  exports: [MappingConnection],
})
export class MappingConnectionModule {}
