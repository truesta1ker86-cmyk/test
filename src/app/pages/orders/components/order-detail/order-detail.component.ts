import { ORDER_DETAILS_TABLE_COLUMNS1 } from './infrastructure/constants/order-detail.constants';
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
  OnDestroy,
} from '@angular/core';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { WorkspaceApi } from '../../infrastructure/services/workspace-api.service';
import type { OrderDetail } from '../../infrastructure/interfaces/contracts.interfaces';
import { currency, quantity, status } from '../../infrastructure/utils/format.utils';
import { date } from '../../../../core/infrastructure/utils/format.utils';
import { errorMessage } from '../../../../core/infrastructure/utils/api.utils';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { canPrepare } from '../../infrastructure/utils/operational-logic.utils';
import { BehaviorSubject, catchError, combineLatest, of, switchMap, tap } from 'rxjs';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-order-detail',

  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css',
})
export class OrderDetails implements AfterViewInit, OnDestroy {
  tableColumns1(): DataTableColumn[] {
    return ORDER_DETAILS_TABLE_COLUMNS1;
  }

  readonly posting = input.required<string>();
  readonly closed = output<void>();
  readonly changed = output<void>();
  readonly saving = signal(false);
  private readonly context = inject(SessionContext);
  readonly canPack = computed(() => {
    const data = this.data(),
      session = this.context.session();
    return (
      !!data?.local_preview &&
      !!session &&
      (session.is_owner || session.role === 'manager') &&
      canPrepare(data.order)
    );
  });
  readonly data = signal<OrderDetail | null>(null);
  readonly error = signal('');
  readonly loading = signal(true);
  readonly date = date;
  readonly currency = currency;
  readonly quantity = quantity;
  readonly status = status;
  private readonly api = inject(WorkspaceApi);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previous: HTMLElement | null = null;
  private readonly reload = new BehaviorSubject(0);
  constructor() {
    combineLatest([toObservable(this.posting), this.reload])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
          this.data.set(null);
        }),
        switchMap(([posting]) =>
          this.api.order(posting).pipe(
            catchError((e) => {
              this.error.set(errorMessage(e));
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
  ngAfterViewInit() {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog().nativeElement.showModal();
  }
  load() {
    this.reload.next(this.reload.value + 1);
  }
  prepare() {
    if (!this.canPack() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .localPrepare(this.posting(), true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.saving.set(false);
          this.changed.emit();
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.saving.set(false);
        },
      });
  }
  close(event?: Event) {
    event?.preventDefault();
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  ngOnDestroy() {
    this.dialog().nativeElement.close();
    if (this.previous?.isConnected) this.previous.focus();
  }
}
