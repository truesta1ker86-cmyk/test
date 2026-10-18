import {
  OVERVIEW_PAGE_TABLE_COLUMNS1,
  OVERVIEW_PAGE_TABLE_COLUMNS2,
} from './infrastructure/constants/overview-page.constants';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceApi } from '../../../orders/infrastructure/services/workspace-api.service';
import type { Overview } from '../../../orders/infrastructure/interfaces/contracts.interfaces';
import { currency, status } from '../../../orders/infrastructure/utils/format.utils';
import { date } from '../../../../core/infrastructure/utils/format.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-workspace-overview',

  templateUrl: './overview-page.component.html',
  styleUrl: './overview-page.component.css',
})
export class OverviewPage {
  tableColumns1(): DataTableColumn[] {
    return OVERVIEW_PAGE_TABLE_COLUMNS1;
  }
  tableColumns2(): DataTableColumn[] {
    return OVERVIEW_PAGE_TABLE_COLUMNS2;
  }

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
