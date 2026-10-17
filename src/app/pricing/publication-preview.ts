import { ProductName } from '../shared/product-name';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, errorMessage } from '../core/api';
import { Scope } from './editor-contracts';
import { money, date } from '../core/format';
export interface PricingPublicationRun {
  id: string;
  created_at: string;
  sends_enabled: boolean;
  sent: number;
  items: {
    offer_id: string;
    name: string;
    status: string;
    price: string | null;
    min_price: string | null;
    old_price: string | null;
    current_price: string | null;
    reason: string;
  }[];
}
@Component({
  selector: 'app-pricing-publication-preview',
  imports: [ProductName, FormsModule],
  template: ` <section class="panel">
    <h2>Автоматическая отправка цен</h2>
    <p>Локальный режим: можно проверить готовность цен. Отправки и фоновый запуск отключены.</p>
    <div class="button-row">
      <label><input type="checkbox" disabled />Боевая отправка цен в Ozon</label
      ><label><input type="checkbox" disabled />Автоматическая отправка</label>
    </div>
    <div class="button-row">
      <button class="button primary" type="button" (click)="inspect()" [disabled]="busy()">
        Проверить готовность по отбору</button
      ><button class="button" type="button" (click)="load()" [disabled]="busy()">
        Обновить историю проверок</button
      ><button class="button" type="button" (click)="repair.emit()">
        Исправить нерассчитанные
      </button>
    </div>
    @if (error()) {
      <p class="workflow-error" role="alert">{{ error() }}</p>
    }
    <div class="filter-bar">
      <label
        >Проверка<select
          aria-label="Проверка готовности цен"
          [ngModel]="selected()"
          (ngModelChange)="selected.set($event)"
        >
          <option value="">Выберите проверку</option>
          @for (run of runs(); track run.id) {
            <option [value]="run.id">
              {{ date(run.created_at) }} · {{ run.items.length }} товаров
            </option>
          }
        </select></label
      >
      <label
        >Результат<select aria-label="Результат проверки" [(ngModel)]="status">
          <option value="">Все результаты</option>
          <option value="ready">Готово к отправке</option>
          <option value="blocked">Нужны данные</option>
          <option value="unchanged">Уже совпадает</option>
        </select></label
      >
    </div>
    @if (current(); as run) {
      <p>Проверено: {{ run.items.length }} · отправлено: 0</p>
      <div class="table-scroll">
        <table class="price-workflow-table">
          <thead>
            <tr>
              <th>Товар</th>
              <th>Сейчас</th>
              <th>Цена</th>
              <th>Минималка</th>
              <th>До скидки</th>
              <th>Результат</th>
            </tr>
          </thead>
          <tbody>
            @for (row of run.items; track row.offer_id) {
              @if (!status || row.status === status) {
                <tr>
                  <td>
                    {{ row.offer_id }}<small [appProductName]="row">{{ row.name }}</small>
                  </td>
                  <td>{{ money(row.current_price) }}</td>
                  <td>{{ money(row.price) }}</td>
                  <td>{{ money(row.min_price) }}</td>
                  <td>{{ money(row.old_price) }}</td>
                  <td>
                    {{ labels[row.status] }}<small>{{ row.reason }}</small>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    }
  </section>`,
  styleUrl: './pricing-workflow.css',
})
export class PricingPublicationPreview {
  readonly scope = input<Scope>({});
  readonly repair = output<void>();
  readonly runs = signal<PricingPublicationRun[]>([]);
  readonly selected = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  status = '';
  readonly money = money;
  readonly date = date;
  readonly labels: Record<string, string> = {
    ready: 'Готово к отправке',
    blocked: 'Нужны данные',
    unchanged: 'Уже совпадает',
  };
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    this.load();
  }
  current() {
    return this.runs().find((r) => r.id === this.selected());
  }
  load() {
    this.api
      .pricingPublicationRuns()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.runs.set(r.items);
          if (!this.selected()) this.selected.set(r.items[0]?.id || '');
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  inspect() {
    this.busy.set(true);
    this.error.set('');
    this.api
      .previewPricingPublication(this.scope())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.runs.update((rows) => [r, ...rows]);
          this.selected.set(r.id);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
}
