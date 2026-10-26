import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { downloadErrorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { TABLE_DATA_SERVICE } from '../../../../shared/data-table/infrastructure/tokens/table-data-source.token';
import type {
  ColumnChange,
  ColumnRules,
} from '../../../../shared/directives/filter-panel/filter-panel';
import type {
  ListPage,
  ListQuery,
  ReturnRow,
} from '../../../orders/infrastructure/interfaces/contracts.interfaces';
import { WorkspaceApi } from '../../../orders/infrastructure/services/workspace-api.service';
import { download } from '../../../orders/infrastructure/utils/format.utils';
import { sortOperational } from '../../../orders/infrastructure/utils/operational-logic.utils';
import { RETURN_SORTS } from '../../infrastructure/constants/returns.constants';

@Component({
  selector: 'app-returns',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: TABLE_DATA_SERVICE, useExisting: WorkspaceApi }],
  templateUrl: './returns.component.html',
  styleUrl: './returns.component.css',
})
export class ReturnsComponent {
  private readonly api = inject(WorkspaceApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);

  readonly databaseCopy = inject(SessionContext).databaseCopy;
  readonly sorts = RETURN_SORTS;
  readonly data = signal<ListPage | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly refreshVersion = signal(0);
  readonly headingSort = signal({ field: '', desc: false });
  readonly query = signal<ListQuery>({
    q: '',
    status: '',
    scheme: '',
    lifecycle: '',
    start: '',
    end: '',
    page: 1,
    page_size: 50,
    sort: 'date_desc',
    column_filters: '',
  });
  readonly rows = computed(
    () =>
      sortOperational(
        this.data()?.items || [],
        'returns',
        this.headingSort().field,
        this.headingSort().desc,
      ) as ReturnRow[],
  );
  readonly columnRules = computed<ColumnRules>(() => {
    try {
      const value = JSON.parse(this.query().column_filters || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  });

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params): ListQuery => ({
          q: params.get('q') || '',
          status: params.get('status') || '',
          scheme: params.get('scheme') || '',
          lifecycle: '',
          start: params.get('start') || '',
          end: params.get('end') || '',
          page: Math.max(1, Math.floor(Number(params.get('page')) || 1)),
          page_size: [25, 50, 100].includes(Number(params.get('page_size')))
            ? Number(params.get('page_size'))
            : 50,
          sort: RETURN_SORTS.some((option) => option.value === params.get('sort'))
            ? params.get('sort')!
            : 'date_desc',
          column_filters: params.get('column_filters') || '',
        })),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((query) => {
        this.query.set(query);
        this.loading.set(true);
      });
  }

  onFilterChange(filter: ListQuery): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { ...filter, page: 1 } });
  }

  sortHeading(field: string): void {
    this.headingSort.update((sort) => ({ field, desc: sort.field === field ? !sort.desc : false }));
  }

  columnChanged(change: ColumnChange): void {
    const rules = { ...this.columnRules() };
    if (change.rule) rules[change.field] = change.rule;
    else delete rules[change.field];
    this.onFilterChange({
      ...this.query(),
      column_filters: Object.keys(rules).length ? JSON.stringify(rules) : '',
    });
  }

  onPageChange(event: { rows: number; first: number }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.query(), page: event.first / event.rows + 1, page_size: event.rows },
    });
  }

  onDataLoaded(data: ListPage): void {
    this.data.set(data);
    this.loading.set(false);
    this.error.set('');
  }

  onDataError(): void {
    this.data.set(null);
    this.loading.set(false);
    this.error.set('Не удалось загрузить список. Повторите запрос.');
  }

  refresh(): void {
    this.loading.set(true);
    this.refreshVersion.update((value) => value + 1);
  }

  export(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.error.set('');
    this.api
      .export('returns', this.query())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (blob) => {
          download(blob, 'returns-v2.csv');
          this.exporting.set(false);
        },
        error: async (error) => {
          this.error.set(await downloadErrorMessage(error));
          this.exporting.set(false);
        },
      });
  }
}
