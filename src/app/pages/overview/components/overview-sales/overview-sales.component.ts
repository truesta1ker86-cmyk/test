import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { SalesDynamicsApi } from './infrastructure/services/sales-dynamics-api.service';
import type { SalesDynamics } from './infrastructure/interfaces/sales-dynamics.interfaces';
import {
  SALES_DEFAULT_PERIOD,
  SALES_PERIODS,
  SALES_DAY_COLUMNS,
} from './infrastructure/constants/sales-dynamics.constants';
import {
  salesChartData,
  salesChartOptions,
  salesDate,
  salesUnits,
} from './infrastructure/utils/sales-chart.utils';
import { date, money } from '../../../../core/infrastructure/utils/format.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  selector: 'app-overview-sales',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SalesDynamicsApi],
  templateUrl: './overview-sales.component.html',
  styleUrl: './overview-sales.component.css',
})
export class OverviewSales {
  readonly refresh = input(0);
  readonly days = signal<number>(SALES_DEFAULT_PERIOD);
  readonly periods = SALES_PERIODS;
  readonly dayColumns = SALES_DAY_COLUMNS;
  readonly data = signal<SalesDynamics | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly chartData = computed(() => {
    const data = this.data();
    return data ? salesChartData(data) : undefined;
  });
  readonly chartOptions = computed(() => salesChartOptions(this.data()));
  readonly peak = computed(() => {
    const best = this.data()?.best_day;
    return best && best.units > 0
      ? salesDate(best.date) + ' · ' + salesUnits(best.units) + ' шт.'
      : '—';
  });
  readonly money = money;
  readonly date = date;
  readonly units = salesUnits;
  readonly day = salesDate;
  private readonly reload = signal(0);
  private readonly api = inject(SalesDynamicsApi);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    combineLatest([toObservable(this.days), toObservable(this.refresh), toObservable(this.reload)])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
          this.data.set(null);
        }),
        switchMap(([days]) =>
          this.api.load(days).pipe(
            catchError((error) => {
              this.error.set(errorMessage(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((data) => {
        this.data.set(data);
        this.loading.set(false);
      });
  }

  setDays(raw: string) {
    const period = this.periods.find((period) => period.days === Number(raw));
    if (period) this.days.set(period.days);
  }

  retry() {
    this.reload.update((value) => value + 1);
  }
}
