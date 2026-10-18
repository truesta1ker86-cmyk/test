import { NgModule, ModuleWithProviders } from '@angular/core';
import { resolveSseConfig } from './infrastructure/utils/sse.utils';
import { SSE_CONFIG } from './infrastructure/constants/sse.constants';
import type { SseConfig } from './infrastructure/interfaces/sse.interfaces';
import { EventsService } from './infrastructure/services/events-service.service';
import { ProgressService } from './infrastructure/services/progress-service.service';

@NgModule()
export class SseModule {
  static forRoot(config: SseConfig): ModuleWithProviders<SseModule> {
    return {
      ngModule: SseModule,
      providers: [
        { provide: SSE_CONFIG, useValue: resolveSseConfig(config) },
        EventsService,
        ProgressService,
      ],
    };
  }
}
