import { ProductHoverPreviewModule } from '../product-preview/directives/product-hover-preview.module';
import { RouterLink } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from './page/page.component';
import { IconsSpriteModule } from '../icons-sprite/icons-sprite.module';
import { NavigationModule } from '../navigation/navigation.module';

@NgModule({
  declarations: [PageComponent],
  imports: [
    CommonModule,
    RouterLink,
    ProductHoverPreviewModule,
    IconsSpriteModule,
    NavigationModule,
  ],
  exports: [PageComponent],
})
export class PageModule {}
