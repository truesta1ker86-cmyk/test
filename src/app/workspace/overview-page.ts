import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceApi } from './api';
import { Overview } from './contracts';
import { currency, status } from './format';
import { date } from '../core/format';
import { errorMessage } from '../core/api';
@Component({
  selector: 'app-workspace-overview',
  imports: [RouterLink],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class OverviewPage {
  readonly data = signal<Overview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly currency = currency;
  readonly status = status;
  readonly date = date;
  private readonly api = inject(WorkspaceApi);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .overview()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
  operation(value: string) {
    const names: Record<string, string> = {
      order: 'Заказы',
      orders: 'Заказы',
      stock: 'Остатки',
      stocks: 'Остатки',
      product: 'Товары',
      products: 'Товары',
      v2_ai: 'AI карточки',
      ai_attributes: 'AI-характеристики',
      ai_image: 'AI-фото',
      product_mapping: 'Сопоставление с 1С',
      pricing: 'Расчёт цен',
      product_cost_quant: 'Стоимость и квант',
      product_card_draft: 'Черновик карточки',
    };
    return names[value] || value;
  }
}
