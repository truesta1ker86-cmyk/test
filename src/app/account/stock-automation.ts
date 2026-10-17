import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalFocus } from '../shared/directives/modal-focus/modal-focus.directive';
import { Account } from './contracts';
import { LocalStockAutomation } from './local-stock-automation';

@Component({
  selector: 'app-stock-automation',
  imports: [FormsModule, RouterLink, ModalFocus],
  templateUrl: './stock-automation.html',
  styleUrl: './stock-automation.css',
})
export class StockAutomationPanel {
  readonly tenantId = input.required<number>();
  readonly owner = input(false);
  readonly localPreview = input(false);
  readonly summary = input<Account['stock_automation']>(null);
  private readonly store = inject(LocalStockAutomation);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('activationDialog');
  private readonly checkedContext = signal<string | null>(null);
  private readonly contextKey = computed(() =>
    JSON.stringify([this.tenantId(), this.owner(), this.localPreview(), this.summary()]),
  );
  readonly state = computed(() => this.store.forShop(this.tenantId())());
  readonly opened = computed(() => this.checkedContext() !== null);
  readonly canOpen = computed(
    () => this.owner() && this.localPreview() && (this.summary()?.enabled_rules_count || 0) > 0,
  );
  readonly notice = signal('');
  saved = false;
  reviewed = false;
  fixed = false;
  confirmation = '';

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
    effect(() => {
      if (this.opened() && this.checkedContext() !== this.contextKey()) this.stale();
    });
  }
  open() {
    if (!this.canOpen()) {
      this.notice.set(
        !this.owner()
          ? 'Настройки доступны только владельцу.'
          : !this.localPreview()
            ? 'Проверка запуска доступна только в локальном макете.'
            : !this.summary()
              ? 'Сначала загрузите снимок правил.'
              : 'Сначала сохраните включённые правила остатков.',
      );
      return;
    }
    this.saved = this.reviewed = this.fixed = false;
    this.confirmation = '';
    this.notice.set('');
    this.checkedContext.set(this.contextKey());
  }
  close() {
    this.checkedContext.set(null);
    this.notice.set('');
  }
  private stale() {
    this.checkedContext.set(null);
    this.notice.set('Магазин, права или правила изменились. Выполните проверку заново.');
  }
  canStart() {
    return (
      this.canOpen() &&
      this.opened() &&
      this.checkedContext() === this.contextKey() &&
      this.saved &&
      this.reviewed &&
      this.confirmation.trim() === 'ЗАПУСТИТЬ' &&
      (!this.summary()?.fixed_target_rules_count || this.fixed)
    );
  }
  start() {
    if (this.opened() && this.checkedContext() !== this.contextKey()) {
      this.stale();
      return;
    }
    if (!this.canStart()) {
      this.notice.set(
        'Подтвердите сохранение и проверку правил, режим постоянного уровня при его наличии и введите ЗАПУСТИТЬ.',
      );
      return;
    }
    this.store.start(this.tenantId(), this.fixed);
    this.checkedContext.set(null);
    this.notice.set(
      'Макет запущен. Изменилось только состояние интерфейса; фоновые циклы и отправки не выполняются.',
    );
  }
  stop() {
    if (!this.owner() || !this.localPreview() || this.state().status !== 'running') return;
    this.store.stop(this.tenantId());
    this.checkedContext.set(null);
    this.notice.set('Макет остановлен. Разрешение постоянного уровня сброшено.');
  }
  refreshState() {
    this.notice.set(
      'Показано текущее состояние локального макета. Серверы 1С и Ozon не опрашивались.',
    );
  }
}
