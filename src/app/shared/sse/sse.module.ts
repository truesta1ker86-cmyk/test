import { NgModule, ModuleWithProviders } from '@angular/core';
import { resolveSseConfig, SSE_CONFIG, SseConfig } from './interfaces/sse.model';
import { EventsService } from './service/events.service';
import { ProgressService } from './service/progress.service';


@NgModule()
export class SseModule {
  static forRoot(config: SseConfig): ModuleWithProviders<SseModule> {
    return {
      ngModule: SseModule,
      providers: [
        { provide: SSE_CONFIG, useValue: resolveSseConfig(config) },
        EventsService,
        ProgressService
      ],
    };
  }
}