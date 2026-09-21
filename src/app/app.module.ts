import { NgModule, LOCALE_ID, APP_INITIALIZER } from '@angular/core'; // 1
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
import { SseModule } from './shared/sse/sse.module';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


registerLocaleData(localeRu);


@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    ProgressSpinnerModule,
    BrowserAnimationsModule,
    BrowserModule,
    AppRoutingModule,
    PageAttachModule,
    PageModule,
    SseModule.forRoot({
      url: '/events/subscribe',
      autoConnect: true,

      withCredentials: false,

      maxRetries: 10,
      baseDelay: 1000,
      maxDelay: 30_000,

      heartbeatTimeout: 45_000,

      maxItems: 500,
      batchInterval: 100,
      errorLogThrottle: 5_000,

      logUnknownEvents: false,

      onError: (err) => console.warn('[SSE]', err.type, err.message),
      onReconnect: (attempt) => console.info(`[SSE] переподключение #${attempt}`),
      onStatusChange: (status) => console.log('[SSE status]', status),
    }),
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
        requestTimeoutMs: 30_000,   // ← 30 секунд
      },   
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  
}