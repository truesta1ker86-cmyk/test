import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ModalFocus } from '../shared/directives/modal-focus/modal-focus.directive';
import type { StockWarehouse } from './contracts';

@Component({
  selector: 'app-warehouse-picker',
  imports: [ModalFocus],
  template: `
    <div class="picker-actions">
      <button
        type="button"
        class="picker-trigger"
        aria-haspopup="dialog"
        [attr.aria-expanded]="opened()"
        (click)="open()"
      >
        <span aria-hidden="true">▤</span>
        <span class="picker-copy">{{
          remaining() ? 'Добавить склады' : 'Все склады уже добавлены'
        }}</span>
        <small>{{ added().length }} из {{ catalog().length }}</small
        ><span aria-hidden="true">⌄</span>
      </button>
      <button
        type="button"
        class="button"
        (click)="add()"
        [disabled]="disabled() || !pending().size"
      >
        ＋ Добавить выбранные{{ pending().size ? ' · ' + pending().size : '' }}
      </button>
    </div>
    @if (opened()) {
      <div
        class="warehouse-menu"
        role="dialog"
        aria-label="Склады маркетплейса"
        appModalFocus
        (modalEscape)="close()"
      >
        <header>
          <div>
            <strong>Склады маркетплейса</strong><small>Можно выбрать несколько складов сразу</small>
          </div>
          <button type="button" aria-label="Закрыть выбор складов" (click)="close()">×</button>
        </header>
        <div class="warehouse-options">
          @for (w of catalog(); track w.warehouse_id) {
            @let exists = added().includes(w.warehouse_id);
            <label [class.already-added]="exists">
              <input
                type="checkbox"
                [checked]="exists || pending().has(w.warehouse_id)"
                [disabled]="
                  disabled() ||
                  exists ||
                  w.available === false ||
                  (!pending().has(w.warehouse_id) && !slots())
                "
                (change)="toggle(w.warehouse_id, $any($event.target).checked)"
              />
              <span
                ><b>{{ w.warehouse_name }}</b
                ><small
                  ><span class="scheme">{{ w.is_rfbs ? 'rFBS' : 'FBS' }}</span>
                  @if (exists) {
                    <span class="added-badge">✓ Уже добавлен</span>
                  } @else if (w.available === false) {
                    <span>Недоступен в Ozon</span>
                  }
                </small></span
              >
            </label>
          } @empty {
            <p>Список ещё не загружен. Прочитайте склады на вкладке «Склады».</p>
          }
        </div>
        <footer>
          <small>{{
            remaining() ? 'Выбрано новых: ' + pending().size : 'Все склады уже находятся в таблице'
          }}</small>
          <small>{{
            slots() ? 'До 12 в таблице' : 'В таблице уже 12 складов. Сначала скройте один из них.'
          }}</small>
          @if (pending().size) {
            <button type="button" class="button primary" (click)="add()" [disabled]="disabled()">
              Добавить · {{ pending().size }}
            </button>
          }
        </footer>
      </div>
    }
  `,
  styleUrl: './warehouse-picker.css',
})
export class WarehousePicker {
  readonly warehouses = input.required<StockWarehouse[]>();
  readonly added = input.required<string[]>();
  readonly disabled = input(false);
  readonly addedChange = output<string[]>();
  readonly opened = signal(false);
  readonly pending = signal(new Set<string>());
  readonly catalog = computed(() =>
    this.warehouses().filter((w) => w.available !== false || this.added().includes(w.warehouse_id)),
  );
  readonly remaining = computed(
    () => this.catalog().filter((w) => !this.added().includes(w.warehouse_id)).length,
  );
  readonly slots = computed(() => Math.max(0, 12 - this.added().length - this.pending().size));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  open() {
    this.opened() ? this.close() : this.opened.set(true);
  }
  close() {
    this.opened.set(false);
  }
  toggle(id: string, checked: boolean) {
    const warehouse = this.warehouses().find((w) => w.warehouse_id === id);
    if (
      this.disabled() ||
      !warehouse ||
      warehouse.available === false ||
      this.added().includes(id) ||
      (checked && !this.slots())
    )
      return;
    this.pending.update((values) => {
      const next = new Set(values);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }
  add() {
    if (this.disabled()) return;
    const valid = new Set(
      this.warehouses()
        .filter((w) => w.available !== false)
        .map((w) => w.warehouse_id),
    );
    const additions = [...this.pending()].filter(
      (id) => valid.has(id) && !this.added().includes(id),
    );
    if (this.added().length + additions.length > 12) return;
    this.addedChange.emit([...this.added(), ...additions]);
    this.pending.set(new Set());
    this.close();
  }
  @HostListener('document:pointerdown', ['$event']) outside(event: Event) {
    if (
      this.opened() &&
      event.target instanceof Node &&
      !this.element.nativeElement.contains(event.target)
    )
      this.close();
  }
}
