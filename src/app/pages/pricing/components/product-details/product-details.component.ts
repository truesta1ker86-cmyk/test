import { PRODUCT_DETAILS_TABLE_COLUMNS1 } from './infrastructure/constants/product-details.constants';
import {
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import type {
  Calculation,
  PricingRow,
  PricingSalesSnapshot,
} from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { date, money, percent, source } from '../../../../core/infrastructure/utils/format.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-product-details',

  templateUrl: './product-details.component.html',
  styleUrl: '../../infrastructure/styles/pricing-workflow.css',
})
export class ProductDetails implements AfterViewInit {
  tableColumns1(): DataTableColumn[] {
    return PRODUCT_DETAILS_TABLE_COLUMNS1;
  }

  readonly row = input.required<PricingRow>();
  readonly closed = output<void>();
  readonly history = signal<Calculation[]>([]);
  readonly sales = signal<PricingSalesSnapshot | null>(null);
  readonly salesError = signal('');
  readonly busy = signal(true);
  readonly error = signal('');
  readonly money = money;
  readonly percent = percent;
  readonly date = date;
  readonly source = source;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly api = inject(Api);
  private readonly destroy = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
    this.loadHistory();
    this.api
      .pricingSales(this.row().offer_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.sales.set(r),
        error: (e) => this.salesError.set(errorMessage(e)),
      });
  }
  close(event?: Event): void {
    event?.preventDefault();
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  loadHistory(): void {
    this.busy.set(true);
    this.error.set('');
    this.api
      .history(this.row().offer_id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (response) => {
          this.history.set(response.items);
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
