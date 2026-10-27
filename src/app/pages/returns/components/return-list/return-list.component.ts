import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { date } from '../../../../core/infrastructure/utils/format.utils';
import type {
  ColumnChange,
  ColumnRules,
} from '../../../../shared/directives/filter-panel/filter-panel';
import type { ColumnValuesRequest } from '../../../../shared/directives/filter-panel/infrastructure/interfaces/column-rule.interfaces';
import type {
  ColumnValuesState,
  ListPage,
  ListQuery,
  ReturnRow,
} from '../../../orders/infrastructure/interfaces/contracts.interfaces';
import { WorkspaceApi } from '../../../orders/infrastructure/services/workspace-api.service';
import { currency, status } from '../../../orders/infrastructure/utils/format.utils';
import { RETURN_COLUMNS } from '../../infrastructure/constants/returns.constants';

@Component({
  selector: 'app-return-list',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-list.component.html',
  styleUrl: './return-list.component.css',
})
export class ReturnListComponent {
  private readonly api = inject(WorkspaceApi);
  private readonly destroy = inject(DestroyRef);
  private choiceRequest?: Subscription;

  readonly returns = input<ReturnRow[]>([]);
  readonly filters = input.required<ListQuery>();
  readonly headingSort = input({ field: '', desc: false });
  readonly columnRules = input<ColumnRules>({});
  readonly refreshToken = input<unknown>();
  readonly pageChange = output<{ rows: number; first: number }>();
  readonly sortChange = output<string>();
  readonly columnChange = output<ColumnChange>();
  readonly dataLoaded = output<ListPage>();
  readonly dataFailed = output<unknown>();
  readonly choices = signal<ColumnValuesState>({
    field: '',
    values: [],
    busy: false,
    error: '',
    total: 0,
    hasMore: false,
  });
  readonly columns = RETURN_COLUMNS;
  readonly date = date;
  readonly currency = currency;
  readonly status = status;

  loadChoices(field: string, request: ColumnValuesRequest): void {
    this.choiceRequest?.unsubscribe();
    this.choices.set({ field, values: [], busy: true, error: '', total: 0, hasMore: false });
    this.choiceRequest = this.api
      .columnValues('returns', this.filters(), field, request.search, request.page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (response) =>
          this.choices.set({
            field,
            values: response.values,
            counts: response.counts || {},
            busy: false,
            error: '',
            total: response.meta.total,
            hasMore: response.meta.has_more,
          }),
        error: () =>
          this.choices.set({
            field,
            values: [],
            busy: false,
            error: 'Не удалось загрузить значения.',
            total: 0,
            hasMore: false,
          }),
      });
  }
}
