import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProductHoverPreview, localProductImage } from './product-hover-preview.directive';
import { TableColumnHover } from '../../data-table/directives/table-column-hover.directive';
@Component({
  imports: [ProductHoverPreview, TableColumnHover],
  template: `<main appProductHoverPreview appTableColumnHover>
    <table>
      <thead>
        <tr>
          <th>Товар</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <button
              data-product-preview="A"
              data-product-preview-anchor
              data-product-preview-name="Полное название"
              data-product-preview-image="data:image/png;base64,AA=="
              data-product-preview-pin
            >
              A
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <button
              data-product-preview="B"
              data-product-preview-name="Второй товар"
              data-product-preview-image="https://example.invalid/photo.png"
              (click)="clicked = clicked + 1"
            >
              B
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </main>`,
})
class Host {
  clicked = 0;
}
function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return {
    fixture,
    first: fixture.nativeElement.querySelector('[data-product-preview="A"]') as HTMLButtonElement,
    second: fixture.nativeElement.querySelector('[data-product-preview="B"]') as HTMLButtonElement,
  };
}
describe('shared v1 product hover card', () => {
  it('does not open while dragging a financial range or selecting text', () => {
    const { fixture, first } = setup();
    first.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, buttons: 1 }));
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    fixture.destroy();
  });
  it('shows photo, full name and article under the name without a duplicate column tooltip', () => {
    const { fixture, first } = setup();
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      bottom: 70,
      width: 120,
      height: 20,
      right: 220,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    first.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    const card = document.querySelector<HTMLElement>('.o1c-product-preview')!;
    expect(card.style.left).toBe('92px');
    expect(card.style.top).toBe('76px');
    expect(card.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA==');
    expect(card.querySelector('strong')?.textContent).toBe('Полное название');
    expect(card.querySelector('.o1c-product-preview-article')?.textContent).toBe('A');
    expect(document.querySelector('.o1c-column-tooltip')).toBeNull();
    expect(fixture.nativeElement.querySelector('tr.o1c-row-hover')).not.toBeNull();
    fixture.destroy();
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
  });
  it('allows moving from the name into the card and closes after leaving', () => {
    vi.useFakeTimers();
    const { fixture, first } = setup();
    try {
      first.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
      const card = document.querySelector('.o1c-product-preview')!;
      first.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: card }));
      vi.advanceTimersByTime(200);
      expect(card.isConnected).toBe(true);
      card.dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(200);
      expect(card.isConnected).toBe(false);
    } finally {
      fixture.destroy();
      vi.useRealTimers();
    }
  });
  it('closes with the cross without reopening on return focus', () => {
    const { fixture, first } = setup();
    first.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    (document.querySelector('.o1c-product-preview-close') as HTMLButtonElement).click();
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    expect(first.hasAttribute('aria-expanded')).toBe(false);
    fixture.destroy();
  });
  it('never loads remote photos and preserves existing click actions', () => {
    const { fixture, second } = setup();
    second.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(document.querySelector('.o1c-product-preview img')).toBeNull();
    expect(document.querySelector('.o1c-product-preview-missing')?.textContent).toBe(
      'Фото отсутствует',
    );
    second.click();
    expect(fixture.componentInstance.clicked).toBe(1);
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    fixture.destroy();
  });
  it('replaces the card and removes it when its row disappears', async () => {
    const { fixture, first, second } = setup();
    first.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    second.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(document.querySelectorAll('.o1c-product-preview').length).toBe(1);
    expect(document.querySelector('.o1c-product-preview-article')?.textContent).toBe('B');
    second.remove();
    await Promise.resolve();
    expect(document.querySelector('.o1c-product-preview')).toBeNull();
    fixture.destroy();
  });
  it('handles a broken image while keeping the product text', () => {
    const { fixture, first } = setup();
    first.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    document.querySelector('.o1c-product-preview img')!.dispatchEvent(new Event('error'));
    expect(document.querySelector('.o1c-product-preview-missing')?.textContent).toBe(
      'Фото отсутствует',
    );
    expect(document.querySelector('.o1c-product-preview-name')?.textContent).toBe(
      'Полное название',
    );
    fixture.destroy();
  });
  it('only accepts inline images and same-origin local assets', () => {
    for (const value of [
      'javascript:alert(1)',
      'https://example.invalid/a.png',
      '//example.invalid/a.png',
      null,
    ])
      expect(localProductImage(value)).toBeNull();
    expect(localProductImage('data:image/png;base64,AA==')).toContain('data:image/png');
    expect(localProductImage('/v2/assets/image.png')).toContain('/v2/assets/image.png');
  });
});

it('permits saved public Ozon photos only in explicit database-copy mode', () => {
  const image = 'https://ir-3.ozone.ru/s3/multimedia-1-o/7071385272.jpg';
  expect(localProductImage(image)).toBeNull();
  expect(localProductImage(image, true)).toBe(image);
  for (const unsafe of [
    'http://ir-3.ozone.ru/s3/photo.jpg',
    'https://ir-3.ozone.ru.evil.invalid/s3/photo.jpg',
    'https://secret@ir-3.ozone.ru/s3/photo.jpg',
    'https://api-seller.ozon.ru/s3/photo.jpg',
  ])
    expect(localProductImage(unsafe, true)).toBeNull();
});
