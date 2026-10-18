import { editorFields } from './constants/editor-fields.constants';
import { editorValue, displayInput } from './utils/editor-fields.utils';

describe('Editor values', () => {
  it('converts visible percentages to stored rates', () => {
    const field = editorFields.find((f) => f.key === 'fixed_margin')!;
    expect(editorValue(field, '20,01')).toBe('0.2001');
    expect(displayInput(field, '0.2001')).toBe('20.01');
  });
  it('clears a manual cost to automatic, without writing zero', () => {
    expect(
      editorValue(
        editorFields.find((f) => f.key === 'manual_cost')!,
        '',
      ),
    ).toBeNull();
  });
  it('preserves price precision and accepts pasted thousands', () => {
    expect(
      editorValue(
        editorFields.find((f) => f.key === 'manual_cost')!,
        '1 250,1234',
      ),
    ).toBe('1250.1234');
  });
  it('rejects empty quantities and fractional pieces', () => {
    const field = editorFields.find((f) => f.key === 'units_per_item')!;
    expect(() => editorValue(field, '')).toThrow();
    expect(() => editorValue(field, '1.2')).toThrow();
  });
});

describe('Exact pricing inputs', () => {
  it('preserves very small and negative rates when displaying a saved value', () => {
    const f = editorFields.find((f) => f.key === 'fixed_margin')!;
    expect(displayInput(f, '-0.123456789012345')).toBe('-12.3456789012345');
    expect(displayInput(f, '1E-15')).toBe('0.0000000000001');
  });
  it('normalizes the API scheme for the RFBS dropdown', () => {
    expect(
      displayInput(
        editorFields.find((f) => f.key === 'ship_method')!,
        'rFBS',
      ),
    ).toBe('RFBS');
  });
});
