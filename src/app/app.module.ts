import { NgModule, LOCALE_ID } from '@angular/core'; // 1
import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { PageModule } from "./shared/page/page.module";
import { PageAttachModule } from "./shared/directives/page-attach/page-attach.module";
import { registerLocaleData } from "@angular/common";
import localeRu from '@angular/common/locales/ru';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { preloaderInterceptor } from './shared/preloader/infrastructure/services/preloader.interceptor';
import { PRELOADER_CONFIG } from './shared/preloader/infrastructure/tokens/preloader.tokens';


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
    { provide: LOCALE_ID, useValue: 'ru' },
    provideHttpClient(
      withInterceptors([preloaderInterceptor])
    ),
    {
      provide: PRELOADER_CONFIG,
      useValue: {
        respectSkipHeader: true,
        skipHeaderName: 'X-Skip-Preloader',
        logHttpErrors: true,
      },
    },    
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  
}