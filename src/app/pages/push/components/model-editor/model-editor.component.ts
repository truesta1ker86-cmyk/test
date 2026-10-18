import {
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PromotionsApi } from '../../infrastructure/services/promotions-api.service';
import type { PromoWorkspace } from '../../infrastructure/interfaces/contracts.interfaces';
import type { PromotionModel } from '../../infrastructure/types/contracts.types';
import { modelHelp, modelLabel } from '../../infrastructure/utils/contracts.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-promotion-model-editor',

  template: `<dialog
    #dialog
    aria-labelledby="model-title"
    class="catalog-dialog"
    (cancel)="close($event)"
  >
    <header class="dialog-heading">
      <h2 id="model-title">Модель акций для товаров</h2>
      <button class="icon-button" aria-label="Закрыть правило" (click)="close()">×</button>
    </header>
    <div class="catalog-dialog-body">
      <p>Товаров: {{ offers().length }}</p>
      <p>{{ current() }}</p>
      <label
        >Новое правило участия<select
          aria-label="Новое правило участия"
          [(ngModel)]="model"
          [disabled]="busy()"
        >
          <option value="choose" disabled>Выберите правило…</option>
          <option value="">По правилу категории</option>
          <option value="0">Не участвовать</option>
          <option value="1">Бустинг и цена Ozon</option>
          <option value="2">По минимальной цене</option>
        </select></label
      >
      <p>
        {{ model === 'choose' ? 'Выберите новое правило.' : selectedHelp() }}
      </p>
      <p>
        Индивидуальная модель имеет приоритет над категорией. Сохранение правила не меняет участие и
        цены Ozon.
      </p>
      @if (error()) {
        <p class="editor-error" role="alert">{{ error() }}</p>
      }
      <div class="button-row">
        <button class="button" [disabled]="busy()" (click)="close()">Отмена</button
        ><button
          class="button primary"
          [disabled]="busy() || model === 'choose' || !api.allowed(state())"
          (click)="save()"
        >
          Сохранить правило
        </button>
      </div>
    </div>
  </dialog>`,
  styleUrl: '../../../products/infrastructure/styles/catalog-dialog.css',
})
export class PromotionModelEditor implements OnInit, AfterViewInit, OnDestroy {
  readonly offers = input.required<string[]>();
  readonly state = input.required<PromoWorkspace>();
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly busy = signal(false);
  readonly error = signal('');
  readonly api = inject(PromotionsApi);
  selectedHelp() {
    return modelHelp(this.model === '' ? null : (Number(this.model) as PromotionModel));
  }
  private destroy = inject(DestroyRef);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previous: HTMLElement | null = null;
  model = 'choose';
  current() {
    const rows = this.state().products.filter((p) => this.offers().includes(p.offer_id));
    return rows.length === 1
      ? 'Сейчас: ' +
          modelLabel(rows[0].effective_model) +
          ' · ' +
          (rows[0].model_source === 'product'
            ? 'индивидуальное правило'
            : rows[0].model_source === 'category'
              ? 'правило категории'
              : 'модель не назначена')
      : 'Индивидуальные правила: ' +
          rows.filter((p) => p.model !== null).length +
          ' · По категориям: ' +
          rows.filter((p) => p.model_source === 'category').length;
  }
  ngOnInit() {
    const p =
      this.offers().length === 1
        ? this.state().products.find((p) => p.offer_id === this.offers()[0])
        : undefined;
    if (p) this.model = p.model == null ? '' : String(p.model);
  }
  ngAfterViewInit() {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog().nativeElement.showModal();
  }
  save() {
    if (this.busy() || this.model === 'choose' || !this.api.allowed(this.state())) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .save(
        this.state(),
        'product',
        this.offers(),
        this.model === '' ? null : (Number(this.model) as PromotionModel),
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.emit();
          this.closed.emit();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
  close(e?: Event) {
    e?.preventDefault();
    if (this.busy()) return;
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  ngOnDestroy() {
    this.dialog().nativeElement.close();
    if (this.previous?.isConnected) this.previous.focus();
  }
}
