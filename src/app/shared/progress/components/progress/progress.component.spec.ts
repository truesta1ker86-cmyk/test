import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProgressModule } from '../../progress.module';
import { ProgressService } from '../../../sse/infrastructure/services/progress-service.service';
import { ProgressComponent } from './progress.component';

describe('Component-owned progress service', () => {
  it('keeps each component instance separate from the shared SSE module provider', () => {
    TestBed.configureTestingModule({
      imports: [ProgressModule],
      providers: [ProgressService, provideHttpClient(), provideHttpClientTesting()],
    });
    const first = TestBed.createComponent(ProgressComponent);
    const second = TestBed.createComponent(ProgressComponent);
    const firstService = first.debugElement.injector.get(ProgressService);
    const secondService = second.debugElement.injector.get(ProgressService);
    const sharedService = TestBed.inject(ProgressService);
    expect(firstService).not.toBe(secondService);
    expect(firstService).not.toBe(sharedService);
    firstService.retryCount$.set(3);
    expect(secondService.retryCount$()).toBe(0);
    expect(sharedService.retryCount$()).toBe(0);
  });
});
