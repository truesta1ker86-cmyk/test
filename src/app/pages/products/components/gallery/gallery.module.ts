import { NgModule } from '@angular/core';
import { Gallery } from './gallery.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IconModule } from '../../../../shared/icons-sprite/icon/icon.module';

@NgModule({
  declarations: [Gallery],
  imports: [ReactiveFormsModule, IconModule],
  exports: [Gallery],
})
export class GalleryModule {}
