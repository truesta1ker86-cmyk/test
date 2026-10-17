import { Directive, ElementRef, HostListener, inject, OnDestroy, Renderer2 } from '@angular/core';
import { SessionContext } from '../core/session-context';

/** Uses rendered metadata only. Public CDN photos are opt-in for the database copy. */
export function localProductImage(raw: string | null, databaseCopy = false): string | null {
  if (!raw) return null;
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(raw)) return raw;
  try {
    const url = new URL(raw, location.origin);
    if (
      databaseCopy &&
      url.protocol === 'https:' &&
      /^ir(?:-\d+)?\.ozone\.ru$/.test(url.hostname) &&
      url.pathname.startsWith('/s3/') &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return url.href;
    return url.origin === location.origin && /^\/(v2|static)\//.test(url.pathname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
@Directive({ selector: '[appProductHoverPreview]' })
export class ProductHoverPreview implements OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);
  private context = inject(SessionContext);
  private trigger: HTMLElement | null = null;
  private card: HTMLElement | null = null;
  private pinned = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: (() => void)[] = [];
  private returningFocus = false;
  private observer: MutationObserver;
  private readonly reposition = () => this.position();
  constructor() {
    this.observer = new MutationObserver(() => {
      if (this.trigger && !this.trigger.isConnected) this.close();
    });
    this.observer.observe(this.host.nativeElement, { childList: true, subtree: true });
    document.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);
  }
  private find(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const trigger = target.closest<HTMLElement>('[data-product-preview]');
    return trigger && this.host.nativeElement.contains(trigger) ? trigger : null;
  }
  @HostListener('pointerover', ['$event']) over(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.buttons) return;
    const trigger = this.find(event.target);
    if (trigger) {
      this.cancelHide();
      this.open(trigger);
    }
  }
  @HostListener('pointerout', ['$event']) out(event: PointerEvent) {
    if (
      this.trigger &&
      this.find(event.target) === this.trigger &&
      !this.inside(event.relatedTarget)
    )
      this.scheduleHide();
  }
  @HostListener('focusin', ['$event']) focus(event: FocusEvent) {
    if (this.returningFocus) return;
    const trigger = this.find(event.target);
    if (trigger) this.open(trigger);
    else if (this.card && !this.inside(event.target)) this.close();
  }
  @HostListener('focusout', ['$event']) blur(event: FocusEvent) {
    if (
      this.trigger?.contains(event.target as Node) &&
      !this.inside(event.relatedTarget) &&
      !this.pinned
    )
      this.scheduleHide();
  }
  @HostListener('click', ['$event']) click(event: MouseEvent) {
    const trigger = this.find(event.target);
    if (
      trigger &&
      (trigger.hasAttribute('data-product-preview-pin') ||
        !trigger.closest('button,a,input,select,textarea'))
    ) {
      if (this.trigger === trigger && this.pinned) this.close();
      else {
        this.open(trigger);
        this.pinned = true;
      }
    } else if (trigger) this.close(); // Preserve existing click-to-edit/data handlers.
  }
  @HostListener('document:pointerdown', ['$event']) outside(event: PointerEvent) {
    if (this.card && !this.inside(event.target)) this.close();
  }
  @HostListener('document:keydown.escape') escape() {
    this.close(true);
  }
  @HostListener('keydown', ['$event']) keyboard(event: KeyboardEvent) {
    const trigger = this.find(event.target);
    if (
      !trigger ||
      trigger.closest('button,a,input,select,textarea') ||
      !['Enter', ' '].includes(event.key)
    )
      return;
    event.preventDefault();
    if (this.trigger === trigger && this.pinned) this.close();
    else {
      this.open(trigger);
      this.pinned = true;
    }
  }
  private inside(target: EventTarget | null) {
    return (
      target instanceof Node && !!(this.trigger?.contains(target) || this.card?.contains(target))
    );
  }
  private cancelHide() {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
  private scheduleHide() {
    if (this.pinned) return;
    this.cancelHide();
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.close();
    }, 160);
  }
  private node(tag: string, cls: string, text?: string) {
    const node = this.renderer.createElement(tag) as HTMLElement;
    this.renderer.addClass(node, cls);
    if (text !== undefined) this.renderer.setProperty(node, 'textContent', text);
    return node;
  }
  private open(trigger: HTMLElement) {
    if (this.trigger === trigger) {
      this.cancelHide();
      this.position();
      return;
    }
    this.close();
    this.trigger = trigger;
    const name = trigger.dataset['productPreviewName'] || trigger.textContent?.trim() || 'Товар';
    const offer =
      trigger.dataset['productPreviewArticle'] || trigger.dataset['productPreview'] || '';
    const card = this.node('section', 'o1c-product-preview');
    this.card = card;
    this.renderer.setAttribute(card, 'role', 'region');
    this.renderer.setAttribute(card, 'aria-label', 'Карточка товара ' + offer);
    const media = this.node('div', 'o1c-product-preview-media');
    const fallback = () => {
      while (media.firstChild) media.removeChild(media.firstChild);
      media.appendChild(this.node('span', 'o1c-product-preview-missing', 'Фото отсутствует'));
    };
    // Some review dialogs contain only name/article; reuse another already-rendered copy.
    const sibling = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[data-product-preview]'),
    ).find(
      (e) =>
        e !== trigger && e.dataset['productPreview'] === offer && e.dataset['productPreviewImage'],
    );
    const image = localProductImage(
      trigger.getAttribute('data-product-preview-image') ||
        sibling?.getAttribute('data-product-preview-image') ||
        null,
      this.context.databaseCopy(),
    );
    if (image) {
      const img = this.renderer.createElement('img') as HTMLImageElement;
      this.renderer.setAttribute(img, 'alt', name);
      this.renderer.setAttribute(img, 'referrerpolicy', 'no-referrer');
      this.listeners.push(this.renderer.listen(img, 'error', fallback));
      this.renderer.setAttribute(img, 'src', image);
      media.appendChild(img);
    } else fallback();
    const copy = this.node('div', 'o1c-product-preview-copy');
    copy.append(
      this.node('strong', 'o1c-product-preview-name', name),
      this.node('span', 'o1c-product-preview-article', offer),
    );
    const exit = this.node('button', 'o1c-product-preview-close', '×');
    this.renderer.setAttribute(exit, 'type', 'button');
    this.renderer.setAttribute(exit, 'aria-label', 'Закрыть сведения о товаре');
    this.listeners.push(
      this.renderer.listen(exit, 'click', (e: Event) => {
        e.stopPropagation();
        this.close(true);
      }),
    );
    this.listeners.push(this.renderer.listen(card, 'pointerenter', () => this.cancelHide()));
    this.listeners.push(this.renderer.listen(card, 'pointerleave', () => this.scheduleHide()));
    card.append(media, copy, exit);
    this.renderer.appendChild(trigger.closest('dialog') || document.body, card);
    this.renderer.setAttribute(trigger, 'aria-expanded', 'true');
    this.position();
  }
  private position() {
    if (!this.card || !this.trigger) return;
    if (!this.trigger.isConnected) {
      this.close();
      return;
    }
    const anchor = this.trigger.hasAttribute('data-product-preview-anchor')
      ? this.trigger
      : this.trigger.closest('tr')?.querySelector<HTMLElement>('[data-product-preview-anchor]') ||
        this.trigger;
    const box = anchor.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) {
      this.close();
      return;
    }
    const { width, height } = this.card.getBoundingClientRect();
    this.renderer.setStyle(
      this.card,
      'left',
      Math.max(8, Math.min(box.left - 8, innerWidth - width - 8)) + 'px',
    );
    this.renderer.setStyle(
      this.card,
      'top',
      (box.bottom + height + 6 <= innerHeight - 8
        ? box.bottom + 6
        : Math.max(8, box.top - height - 6)) + 'px',
    );
  }
  private close(returnFocus = false) {
    this.cancelHide();
    const trigger = this.trigger;
    if (trigger) this.renderer.removeAttribute(trigger, 'aria-expanded');
    this.listeners.splice(0).forEach((dispose) => dispose());
    if (this.card?.parentNode) this.renderer.removeChild(this.card.parentNode, this.card);
    this.card = null;
    this.trigger = null;
    this.pinned = false;
    if (returnFocus && trigger?.isConnected) {
      this.returningFocus = true;
      trigger.focus({ preventScroll: true });
      this.returningFocus = false;
    }
  }
  ngOnDestroy() {
    this.close();
    this.observer.disconnect();
    document.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
  }
}
