import { TestBed } from '@angular/core/testing';
import { PrimeNG } from 'primeng/config';
import { PeriodPickerModule } from '../../period-picker.module';
import { PeriodPickerComponent } from './period-picker.component';

describe('Period picker draft/apply flow', () => {
  const modal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const media = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }),
    });
  });
  afterAll(() => {
    if (modal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', modal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (media) Object.defineProperty(window, 'matchMedia', media);
    else Reflect.deleteProperty(window, 'matchMedia');
  });
  function setup() {
    TestBed.configureTestingModule({ imports: [PeriodPickerModule] });
    const rootConfig = TestBed.inject(PrimeNG);
    const rootMonths = [...(rootConfig.translation.monthNames || [])];
    const fixture = TestBed.createComponent(PeriodPickerComponent);
    fixture.componentRef.setInput('start', '2020-01-01');
    fixture.componentRef.setInput('end', '2020-01-20');
    const emitted = vi.fn();
    fixture.componentInstance.applied.subscribe(emitted);
    return { fixture, picker: fixture.componentInstance, emitted, rootConfig, rootMonths };
  }
  it('keeps quick choices as a draft and restores the applied range after Cancel', async () => {
    const { fixture, picker, emitted } = setup();
    picker.open();
    await fixture.whenStable();
    picker.preset(7);
    expect(emitted).not.toHaveBeenCalled();
    picker.cancel();
    picker.open();
    expect(picker.draftLabel).toBe('Период: 01.01.2020 – 20.01.2020');
    expect(emitted).not.toHaveBeenCalled();
  });
  it('applies a complete range exactly once, without changing the global locale', async () => {
    const { fixture, picker, emitted, rootConfig, rootMonths } = setup();
    picker.open();
    await fixture.whenStable();
    picker.apply();
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      start: '2020-01-01',
      end: '2020-01-20',
      period: 'custom',
    });
    expect(rootConfig.translation.monthNames).toEqual(rootMonths);
  });
  it('blocks an unfinished range and supports selecting the end before the start', () => {
    const { picker, emitted } = setup();
    picker.open();
    picker.setDraft([new Date(2020, 0, 20), null]);
    picker.apply();
    expect(emitted).not.toHaveBeenCalled();
    picker.setDraft([new Date(2020, 0, 10), null]);
    picker.apply();
    expect(emitted).toHaveBeenCalledWith({
      start: '2020-01-10',
      end: '2020-01-20',
      period: 'custom',
    });
  });
});
