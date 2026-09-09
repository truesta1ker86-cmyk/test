import { NgModule, LOCALE_ID } from '@angular/core'; // 1
import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { PageModule } from "./shared/page/page.module";
import { PageAttachModule } from "./shared/directives/page-attach/page-attach.module";
import { registerLocaleData } from "@angular/common";
import localeRu from '@angular/common/locales/ru';


registerLocaleData(localeRu);

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    PageAttachModule,
    PageModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'ru' } 
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  
}