import { InjectionToken } from '@angular/core';
import { ResolvedSseConfig } from '../types/sse.types';

export const SSE_CONFIG = new InjectionToken<ResolvedSseConfig>('SSE_CONFIG');
