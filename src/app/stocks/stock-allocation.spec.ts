import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StockAllocation } from './stock-allocation';
import { StockDrafts } from './stock-drafts';
import type { MatrixCell } from './contracts';
import { estimateCell } from './matrix-state';
import {
  ProductHoverPreview,
  localProductImage,
} from '../shared/product-preview/directives/product-hover-preview.directive';
describe('Warehouse allocation editing', () => {
  it('does not resurrect drafts when bulk fill is cancelled between animation frames', async () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput(
      'selection',
      new Set(Array.from({ length: 201 }, (_, i) => 'A-' + i)),
    );
    component.draftsChange.subscribe((rows) => fixture.componentRef.setInput('drafts', rows));
    let resume = () => {};
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      resume = () => callback(0);
      return 1;
    });
    try {
      const filling = component.fill();
      expect(component.filling()).toBe(true);
      component.clearEdits();
      resume();
      await filling;
      expect(component.drafts()).toEqual([]);
      expect(component.filling()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('accepts 150000 percent in a cell without capping its quantity at physical stock', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [
      { offer_id: 'A', matrix_physical_base: 46, matrix_physical: 23, units_per_item: 2 },
    ]);
    component.draftsChange.subscribe((rows) => fixture.componentRef.setInput('drafts', rows));
    component.change('A', 'W1', 'percent', '150000');
    expect(component.exactPercent('A', 'W1')).toBe('150000');
    expect(component.displayed(component.rowsByOffer().get('A')!, 'W1')).toBe('34500');
    expect(component.cellError('A', 'W1')).toBe('');
  });
  it('fills every selected warehouse with 150000 percent independently', async () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('allPercent', '150 000');
    component.draftsChange.subscribe((rows) => fixture.componentRef.setInput('drafts', rows));
    await component.fill();
    expect(component.drafts()).toHaveLength(4);
    expect(component.drafts().every((cell) => cell.share === '1500' && cell.enabled)).toBe(true);
    expect(component.errors()).toEqual({});
  });
  it('uses the shared photo/name/article preview without inserting a row or changing allocation', () => {
    TestBed.overrideComponent(StockAllocation, { add: { hostDirectives: [ProductHoverPreview] } });
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [
      {
        offer_id: 'A',
        product_name: 'Полное название товара',
        main_image: 'data:image/png;base64,AA==',
      },
    ]);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.product-title') as HTMLButtonElement;
    title.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    fixture.detectChanges();
    const card = document.querySelector('.o1c-product-preview')!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Полное название товара');
    expect(card.querySelector('img')).not.toBeNull();
    expect(card.querySelector('.o1c-product-preview-article')!.textContent).toBe('A');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    expect(component.drafts()).toEqual([]);
  });
  it('resets the bulk value when switching modes and preserves rounding', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('defaults', {
      W1: { fixed: false, value: '75', quantum: '3' },
      W2: { fixed: true, value: '8', quantum: '1' },
    });
    component.defaultsChange.subscribe((value) => fixture.componentRef.setInput('defaults', value));
    component.setDefault('W1', 'fixed', true);
    expect(component.default('W1')).toEqual({ fixed: true, value: '0', quantum: '3' });
    expect(component.default('W2').value).toBe('8');
    component.setDefault('W1', 'value', '12');
    component.setDefault('W1', 'fixed', false);
    expect(component.default('W1')).toEqual({ fixed: false, value: '100', quantum: '3' });
  });
  it('offers cell-level cancellation for invalid input without discarding other drafts', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [{ offer_id: 'A' }]);
    component.draftsChange.subscribe((rows) => fixture.componentRef.setInput('drafts', rows));
    component.change('A', 'W2', 'percent', '50');
    component.change('A', 'W1', 'percent', '-5');
    fixture.detectChanges();
    const cell = fixture.nativeElement.querySelector('td.warehouse-column');
    const cancel = cell.querySelector('button.reset-cell') as HTMLButtonElement;
    expect(cancel).not.toBeNull();
    cancel.click();
    expect(component.cellError('A', 'W1')).toBe('');
    expect(component.inputValue('A', 'W1', 'percent')).toBe('');
    expect(component.drafts().map((row) => row.warehouse_id)).toEqual(['W2']);
  });
  it('shows independent warehouse balances, unknown snapshots, zero rules and fixed targets', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [
      { offer_id: 'A', matrix_physical_base: 44, matrix_physical: 22, units_per_item: 2 },
    ]);
    fixture.componentRef.setInput(
      'drafts',
      ['W1', 'W2'].map((warehouse_id) => ({
        offer_id: 'A',
        warehouse_id,
        share: '1',
        quantum: 1,
        enabled: true,
        maintain_target: false,
        target_qty: null,
      })),
    );
    const row = component.rowsByOffer().get('A')!;
    expect(component.displayed(row, 'W1')).toBe('22');
    expect(component.displayed(row, 'W2')).toBe('22');
    expect(component.remaining(row, 'W1')).toBe(0);
    expect(component.remaining(row, 'W2')).toBe(0);
    fixture.componentRef.setInput('drafts', [
      {
        offer_id: 'A',
        warehouse_id: 'W1',
        share: null,
        quantum: 5,
        enabled: true,
        maintain_target: true,
        target_qty: 30,
      },
    ]);
    expect(component.displayed(row, 'W1')).toBe('30');
    expect(component.remaining(row, 'W1')).toBe(22);
    expect(component.displayed(row, 'W2')).toBe('0');
    expect(component.remaining({ ...row, matrix_physical: null }, 'W2')).toBeNull();
  });
  it('keeps the exact derived share while showing a readable percent', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [
      { offer_id: 'A', matrix_physical_base: 44, matrix_physical: 44, units_per_item: 1 },
    ]);
    component.draftsChange.subscribe((rows) => fixture.componentRef.setInput('drafts', rows));
    component.change('A', 'W1', 'quantity', '17');
    expect(component.inputValue('A', 'W1', 'percent')).toBe('38.636364');
    expect(component.exactPercent('A', 'W1').length).toBeGreaterThan(18);
    expect(component.displayed(component.rowsByOffer().get('A')!, 'W1')).toBe('17');
    component.change('A', 'W1', 'quantum', '1.5');
    expect(component.invalidCount()).toBe(1);
    component.clearInvalidInputs();
    expect(component.invalidCount()).toBe(0);
    expect(component.displayed(component.rowsByOffer().get('A')!, 'W1')).toBe('17');
  });
  function setup() {
    TestBed.configureTestingModule({ imports: [StockAllocation], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(StockAllocation);
    const component = fixture.componentInstance;
    for (const [key, value] of Object.entries({
      rows: [],
      warehouses: [
        { warehouse_id: 'W1', warehouse_name: 'One' },
        { warehouse_id: 'W2', warehouse_name: 'Two' },
      ],
      rules: [],
      drafts: [],
      selection: new Set(['A', 'B']),
      canWrite: true,
    }))
      fixture.componentRef.setInput(key, value);
    return { fixture, component };
  }
  it('fills each selected warehouse independently and preserves hidden draft cells', async () => {
    const { fixture, component } = setup();
    const hidden: MatrixCell = {
      offer_id: 'C',
      warehouse_id: 'W3',
      share: '0.25',
      quantum: 1,
      maintain_target: false,
      target_qty: null,
      enabled: true,
    };
    fixture.componentRef.setInput('drafts', [hidden]);
    fixture.componentRef.setInput('allPercent', '150,125');
    let result: MatrixCell[] = [];
    component.draftsChange.subscribe((rows) => (result = rows));
    await component.fill();
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual(hidden);
    expect(result.slice(1).every((r) => r.share === '1.50125')).toBe(true);
  });
  it('rejects blank and fractional quantities and reports invalid inline cells', () => {
    const { component } = setup();
    let valid = true,
      emitted = false;
    component.validityChange.subscribe((v) => (valid = v));
    component.draftsChange.subscribe(() => (emitted = true));
    component.change('A', 'W1', 'quantum', '1.5');
    expect(valid).toBe(false);
    expect(emitted).toBe(false);
    component.reset('A', 'W1');
    expect(valid).toBe(true);
    component.change('A', 'W1', 'value', '');
    expect(valid).toBe(false);
  });
  it('edits displayed quantity in physical mode and keeps pack/output rounding', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [
      { offer_id: 'A', matrix_physical_base: 44, matrix_physical: 22, units_per_item: 2 },
    ]);
    fixture.componentRef.setInput('rules', [
      {
        offer_id: 'A',
        warehouse_id: 'W1',
        share: '1',
        quantum: 3,
        enabled: true,
        maintain_target: false,
        target_qty: null,
      },
    ]);
    expect(component.rowsByOffer().get('A')?.matrix_physical).toBe(22);
    let result: MatrixCell[] = [];
    component.draftsChange.subscribe((rows) => (result = rows));
    component.change('A', 'W1', 'quantity', '6');
    expect(estimateCell(44, 2, result[0])).toBe('6');
    expect(result[0].maintain_target).toBe(false);
  });
  it('switches to a fixed target using the existing percent and disables a zero quantity', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('rows', [
      { offer_id: 'A', matrix_physical_base: 44, matrix_physical: 22, units_per_item: 2 },
    ]);
    fixture.componentRef.setInput('rules', [
      {
        offer_id: 'A',
        warehouse_id: 'W1',
        share: '0.8',
        quantum: 1,
        enabled: true,
        maintain_target: false,
        target_qty: null,
      },
    ]);
    expect(component.rowsByOffer().get('A')?.matrix_physical).toBe(22);
    let result: MatrixCell[] = [];
    component.draftsChange.subscribe((rows) => (result = rows));
    component.change('A', 'W1', 'mode', 'fixed');
    expect(result[0].target_qty).toBe(17);
    component.change('A', 'W1', 'quantity', '0');
    expect(result[0].enabled).toBe(false);
  });
  it('returns a changed rule to its original state without leaving a draft', () => {
    const { fixture, component } = setup();
    const saved = {
      offer_id: 'A',
      warehouse_id: 'W1',
      share: '0.5',
      quantum: 1,
      enabled: true,
      maintain_target: false,
      target_qty: null,
    };
    fixture.componentRef.setInput('rules', [saved]);
    fixture.componentRef.setInput('drafts', [{ ...saved, share: '0.8' }]);
    let result: MatrixCell[] = [];
    component.draftsChange.subscribe((rows) => (result = rows));
    component.change('A', 'W1', 'value', '50');
    expect(result).toEqual([]);
  });
  it('retains drafts across sections while separating shops', () => {
    const drafts = new StockDrafts();
    drafts.forShop(4).selection.set(new Set(['A']));
    drafts.forShop(4).columns.set(['W1']);
    expect(drafts.forShop(4).selection().has('A')).toBe(true);
    expect(drafts.forShop(5).selection().size).toBe(0);
    expect(drafts.forShop(5).columns()).toBeNull();
  });
  it('keeps an invalid field blocked while another field is edited', () => {
    const { component } = setup();
    let valid = true;
    component.validityChange.subscribe((value) => (valid = value));
    component.change('A', 'W1', 'percent', 'invalid');
    component.change('A', 'W1', 'quantum', '2');
    expect(valid).toBe(false);
    expect(component.inputValue('A', 'W1', 'percent')).toBe('invalid');
    component.change('A', 'W1', 'percent', '50');
    expect(valid).toBe(true);
  });
  it('orders warehouses by their exact numeric IDs independently of names', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('warehouses', [
      { warehouse_id: '90071992547409931', warehouse_name: 'A' },
      { warehouse_id: '90071992547409930', warehouse_name: 'Z' },
      { warehouse_id: '2', warehouse_name: 'Other' },
    ]);
    expect(component.visible().map((w) => w.warehouse_id)).toEqual([
      '2',
      '90071992547409930',
      '90071992547409931',
    ]);
  });
  it('does not allow executable image URLs in product previews', () => {
    expect(localProductImage('javascript:alert(1)')).toBeNull();
    expect(localProductImage('data:text/html,invalid')).toBeNull();
    expect(localProductImage('https://example.test/image.png')).toBeNull();
  });
});
