import { StockAutomationPanelModule } from './stock-automation.module';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StockAutomationPanel } from './stock-automation.component';
import { LocalStockAutomation } from './infrastructure/services/local-stock-automation.service';

describe('Local stock automation controls', () => {
  // jsdom has no top-layer implementation; focus/inert behaviour is checked in the browser.
  beforeAll(() =>
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    }),
  );
  afterAll(() => Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'));
  const summary = {
    rules_count: 12,
    enabled_rules_count: 8,
    fixed_target_rules_count: 3,
    interval_seconds: 120,
  };
  function setup() {
    TestBed.configureTestingModule({
      imports: [StockAutomationPanelModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(StockAutomationPanel);
    for (const [key, value] of Object.entries({
      tenantId: 4,
      owner: true,
      localPreview: true,
      summary,
    }))
      fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    return {
      fixture,
      panel: fixture.componentInstance,
      store: fixture.debugElement.injector.get(LocalStockAutomation),
      http: TestBed.inject(HttpTestingController),
    };
  }
  function confirm(panel: StockAutomationPanel) {
    panel.saved = true;
    panel.reviewed = true;
    panel.confirmation = 'ЗАПУСТИТЬ';
  }
  it('requires saved/reviewed acknowledgements, exact confirmation and fixed-target permission', () => {
    const { panel } = setup();
    panel.open();
    panel.start();
    expect(panel.state().status).toBe('off');
    confirm(panel);
    panel.start();
    expect(panel.state().status).toBe('off');
    panel.fixed = true;
    panel.confirmation = 'запустить';
    panel.start();
    expect(panel.state().status).toBe('off');
    panel.confirmation = ' ЗАПУСТИТЬ ';
    panel.start();
    expect(panel.state()).toEqual({ status: 'running', fixed: true });
    expect(panel.opened()).toBe(false);
  });
  it('allows physical-only rules without fixed-target permission and never sends HTTP', () => {
    const { fixture, panel, http } = setup();
    fixture.componentRef.setInput('summary', { ...summary, fixed_target_rules_count: 0 });
    panel.open();
    confirm(panel);
    panel.start();
    expect(panel.state()).toEqual({ status: 'running', fixed: false });
    panel.refreshState();
    panel.stop();
    expect(panel.state()).toEqual({ status: 'stopped', fixed: false });
    http.expectNone(() => true);
    http.verify();
  });
  it('cancels without applying settings and resets confirmations when reopened', () => {
    const { panel } = setup();
    panel.open();
    confirm(panel);
    panel.fixed = true;
    panel.close();
    expect(panel.state().status).toBe('off');
    panel.open();
    expect(panel.saved).toBe(false);
    expect(panel.reviewed).toBe(false);
    expect(panel.fixed).toBe(false);
    expect(panel.confirmation).toBe('');
  });
  it('blocks an employee, a non-preview environment and missing or disabled rules', () => {
    const { fixture, panel } = setup();
    for (const [input, value] of [
      ['owner', false],
      ['localPreview', false],
      ['summary', null],
      ['summary', { ...summary, enabled_rules_count: 0 }],
    ] as const) {
      fixture.componentRef.setInput(input, value);
      panel.open();
      confirm(panel);
      panel.fixed = true;
      panel.start();
      expect(panel.state().status).toBe('off');
      fixture.componentRef.setInput('owner', true);
      fixture.componentRef.setInput('localPreview', true);
      fixture.componentRef.setInput('summary', summary);
    }
  });
  it('rejects confirmations after changing shops and keeps their states separate', () => {
    const { fixture, panel, store } = setup();
    panel.open();
    confirm(panel);
    panel.fixed = true;
    fixture.componentRef.setInput('tenantId', 5);
    panel.start();
    expect(store.forShop(4)().status).toBe('off');
    expect(store.forShop(5)().status).toBe('off');
    panel.open();
    confirm(panel);
    panel.fixed = true;
    panel.start();
    expect(store.forShop(5)().status).toBe('running');
    expect(store.forShop(4)().status).toBe('off');
  });
  it('requires a new check when the rule summary changes during confirmation', () => {
    const { fixture, panel } = setup();
    panel.open();
    confirm(panel);
    panel.fixed = true;
    fixture.componentRef.setInput('summary', { ...summary, enabled_rules_count: 9 });
    panel.start();
    expect(panel.state().status).toBe('off');
    expect(panel.notice()).toContain('заново');
  });
  it('closes with Escape and retains local state across profile tab recreation', () => {
    const { fixture, panel, store } = setup();
    panel.open();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.opened()).toBe(false);
    panel.open();
    confirm(panel);
    panel.fixed = true;
    panel.start();
    fixture.destroy();
    expect(store.forShop(4)().status).toBe('running');
    expect(new LocalStockAutomation().forShop(4)().status).toBe('off');
  });
});
