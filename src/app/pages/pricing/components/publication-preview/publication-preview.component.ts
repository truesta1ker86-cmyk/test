import { PUBLICATION_PREVIEW_FILTER_OPTIONS_2 } from './infrastructure/constants/filter-options.constants';
import { FilterService } from '../../../../shared/directives/filter-panel/infrastructure/services/filter.service';
import {
  PRICING_PUBLICATION_PREVIEW_TABLE_COLUMNS1,
  PRICING_PUBLICATION_PREVIEW_LABELS,
} from './infrastructure/constants/publication-preview.constants';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import type { Scope } from '../../infrastructure/interfaces/editor-contracts.interfaces';
import { money, date } from '../../../../core/infrastructure/utils/format.utils';
import type { PricingPublicationRun } from './infrastructure/interfaces/publication-preview.interfaces';

@Component({
  providers: [FilterService],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-pricing-publication-preview',

  templateUrl: './publication-preview.component.html',
  styleUrl: '../../infrastructure/styles/pricing-workflow.css',
})
export class PricingPublicationPreview {
  tableColumns1(): DataTableColumn[] {
    return PRICING_PUBLICATION_PREVIEW_TABLE_COLUMNS1;
  }

  publicationRows(items: PricingPublicationRun['items']) {
    return items.filter((row) => !this.status || row.status === this.status);
  }

  readonly scope = input<Scope>({});
  readonly localPreview = input(false);
  readonly repair = output<void>();
  readonly runs = signal<PricingPublicationRun[]>([]);
  readonly selected = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  status = '';
  readonly money = money;
  readonly date = date;
  readonly labels: Record<string, string> = PRICING_PUBLICATION_PREVIEW_LABELS;
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    effect(() => {
      if (this.localPreview()) this.load();
    });
  }
  current() {
    return this.runs().find((r) => r.id === this.selected());
  }
  load() {
    if (!this.localPreview()) return;
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
    if (!this.localPreview()) return;
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

  selectedOptions() {
    return [
      { value: '', label: 'Выберите проверку' },
      ...this.runs().flatMap((run) => [
        {
          value: String(run.id),
          label: String(this.date(run.created_at)) + ' · ' + String(run.items.length) + ' товаров',
        },
      ]),
    ];
  }
  statusOptions() {
    return PUBLICATION_PREVIEW_FILTER_OPTIONS_2;
  }
}
