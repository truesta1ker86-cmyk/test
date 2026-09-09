import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { PageAttachDirective } from "./page-attach.directive";

@NgModule({
    declarations: [PageAttachDirective],
    imports: [CommonModule],
    exports: [PageAttachDirective]
  })
export class PageAttachModule {}