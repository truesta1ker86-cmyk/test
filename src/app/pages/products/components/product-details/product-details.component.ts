import { CATALOG_PRODUCT_DETAILS_TABLE_COLUMNS1 } from './infrastructure/constants/product-details.constants';
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
  computed,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi } from '../../infrastructure/services/catalog-api.service';
import type { ProductDetailsData } from '../../infrastructure/interfaces/contracts.interfaces';
import { money, source } from '../../../../core/infrastructure/utils/format.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-catalog-product-details',

  templateUrl: './product-details.component.html',
  styleUrls: ['../../infrastructure/styles/catalog-dialog.css', './product-details.component.css'],
})
export class CatalogProductDetails implements AfterViewInit {
  tableColumns1(): DataTableColumn[] {
    return CATALOG_PRODUCT_DETAILS_TABLE_COLUMNS1;
  }

  readonly offer = input.required<string>();
  readonly days = input(30);
  readonly closed = output<void>();
  readonly edit = output<void>();
  readonly data = signal<ProductDetailsData | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly money = money;
  readonly source = source;
  readonly timeline = computed(() => this.data()?.timeline.filter((r) => r.units) || []);
  readonly points = computed(() => {
    const rows = this.data()?.timeline || [],
      max = Math.max(1, ...rows.map((r) => r.units));
    return rows
      .map(
        (r, i) => `${10 + (i / Math.max(1, rows.length - 1)) * 580},${150 - (r.units / max) * 130}`,
      )
      .join(' ');
  });
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly api = inject(CatalogApi);
  private readonly destroy = inject(DestroyRef);
  ngAfterViewInit() {
    this.dialog().nativeElement.showModal();
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api
      .details(this.offer(), this.days())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.data.set(r);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }
  close(event?: Event) {
    event?.preventDefault();
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
}
