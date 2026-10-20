import { LoginPanelModule } from './pages/team/components/login-panel/login-panel.module';
import { IconModule } from './shared/icons-sprite/icon/icon.module';
import { NgModule, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { PageModule } from './shared/page/page.module';
import { PageAttachModule } from './shared/directives/page-attach/page-attach.module';
import { shopInterceptor } from './core/infrastructure/utils/shop-interceptor.utils';
import { preloaderInterceptor } from './shared/preloader/infrastructure/utils/preloader.interceptor.utils';
import { PRELOADER_CONFIG } from './shared/preloader/infrastructure/constants/preloader.constants';
import { providePrimeNG } from 'primeng/config';
import localeRu from '@angular/common/locales/ru';
import Aura from '@primeuix/themes/aura';

registerLocaleData(localeRu);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    PageModule,
    PageAttachModule,
    LoginPanelModule,
    IconModule,
  ],
  providers: [
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'ru' },
    provideHttpClient(withInterceptors([shopInterceptor, preloaderInterceptor])),
    {
      provide: PRELOADER_CONFIG,
      useValue: {
        respectSkipHeader: true,
        skipHeaderName: 'X-Skip-Preloader',
        logHttpErrors: false,
        requestTimeoutMs: 30000,
      },
    },
  ],
  exports: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
