import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from './page/page.component';
import { IconsSpriteComponent } from '../icons-sprite/icons-sprite/icons-sprite.component';
import { IconsSpriteModule } from '../icons-sprite/icons-sprite.module';
import { NavigationModule } from '../navigation/navigation.module';
import { AppModule } from '../../app.module';
import { PageAttachModule } from '../directives/page-attach/page-attach.module';




@NgModule({
  declarations: [
    PageComponent
  ],
  imports: [
    CommonModule,
    IconsSpriteModule,
    NavigationModule
  ],
  exports: [
    PageComponent
  ]
})
export class PageModule { }
