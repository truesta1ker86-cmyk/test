import { filterPosition } from './data-table-filter.utils';

describe('Column filter viewport position', () => {
  it('keeps the complete popup visible when its trigger has moved below the viewport', () => {
    const position = filterPosition(new DOMRect(500, 900, 28, 28), 300, 420, 1280, 720);
    expect(position).toEqual({ left: 228, top: 288 });
  });

  it('fits a tall popup and a trigger outside the left edge into a small viewport', () => {
    const position = filterPosition(new DOMRect(-50, -20, 28, 28), 296, 420, 320, 480);
    expect(position).toEqual({ left: 12, top: 14 });
  });
});
