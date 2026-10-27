import {
  OVERVIEW_ONEC_STATES,
  OVERVIEW_PAGE_TABLE_COLUMNS2,
} from './infrastructure/constants/overview-page.constants';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceApi } from '../../../orders/infrastructure/services/workspace-api.service';
import type { Overview } from '../../../orders/infrastructure/interfaces/contracts.interfaces';
import { status } from '../../../orders/infrastructure/utils/format.utils';
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
  tableColumns2(): DataTableColumn[] {
    return OVERVIEW_PAGE_TABLE_COLUMNS2;
  }

  readonly data = signal<Overview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly chartRefresh = signal(0);
  readonly units = (value: number) => value.toLocaleString('ru-RU');
  readonly today = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .replace(' г.', '');
  readonly allOperations = signal(false);
  readonly operationRows = computed(() => {
    const rows = this.data()?.operations || [];
    return this.allOperations() ? rows : rows.slice(0, 5);
  });
  readonly onec = computed(
    () =>
      OVERVIEW_ONEC_STATES[this.data()?.status.integrations.onec_state || ''] || {
        label: 'Нет данных о подключении',
        tone: 'muted',
      },
  );
  readonly status = status;
  readonly date = date;
  private readonly api = inject(WorkspaceApi);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    this.load();
  }
  load() {
    this.chartRefresh.update((value) => value + 1);
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
  action(entity: string) {
    if (entity === 'product_mapping') return 'Сопоставление с 1С';
    if (entity === 'pricing') return 'Расчёт цен';
    if (entity === 'product_card_draft') return 'Изменение карточки';
    return 'Обновление данных';
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
