import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-stock-pager',

  template: ` <div class="stock-pager" [attr.aria-label]="label()">
    <span>Строки {{ total() ? (page() - 1) * size() + 1 : 0 }}–{{ end() }} из {{ total() }}</span>
    <label
      >На странице
      <select
        aria-label="Строк на странице"
        [ngModel]="size()"
        (ngModelChange)="pageChange.emit({ page: 1, size: +$event })"
        [disabled]="busy()"
      >
        @for (value of [50, 100, 200, 500]; track value) {
          <option [ngValue]="value">{{ value }}</option>
        }
      </select></label
    >
    <button
      type="button"
      aria-label="Первая страница"
      (click)="go(1)"
      [disabled]="busy() || page() <= 1"
    >
      «</button
    ><button
      type="button"
      aria-label="Предыдущая страница"
      (click)="go(page() - 1)"
      [disabled]="busy() || page() <= 1"
    >
      ‹
    </button>
    <label
      >Страница
      <input
        type="number"
        aria-label="Номер страницы"
        [(ngModel)]="destination"
        (keydown.enter)="jump()"
        [min]="1"
        [max]="pages()"
        [disabled]="busy()" /></label
    ><span>из {{ pages() }}</span>
    <button type="button" (click)="jump()" [disabled]="busy()">Перейти</button
    ><button
      type="button"
      aria-label="Следующая страница"
      (click)="go(page() + 1)"
      [disabled]="busy() || page() >= pages()"
    >
      ›</button
    ><button
      type="button"
      aria-label="Последняя страница"
      (click)="go(pages())"
      [disabled]="busy() || page() >= pages()"
    >
      »
    </button>
  </div>`,
  styles: `
    .stock-pager {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin: 14px 0;
      font-size: 12px;
      color: var(--muted);
    }
    .stock-pager > span:first-child {
      margin-right: auto;
    }
    .stock-pager label {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .stock-pager input {
      width: 64px !important;
      min-height: 32px !important;
      padding: 4px 6px !important;
    }
    .stock-pager select {
      width: 76px !important;
      min-height: 32px !important;
      padding: 4px 6px !important;
    }
    .stock-pager button {
      min-width: 30px;
    }
  `,
})
export class StockPager {
  readonly label = input('Страницы таблицы');
  readonly page = input(1);
  readonly size = input(100);
  readonly total = input(0);
  readonly busy = input(false);
  readonly pageChange = output<{ page: number; size: number }>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly end = computed(() => Math.min(this.page() * this.size(), this.total()));
  destination: number | null = 1;
  constructor() {
    effect(() => {
      this.destination = this.page();
    });
  }
  go(page: number) {
    this.pageChange.emit({ page: Math.max(1, Math.min(this.pages(), page)), size: this.size() });
  }
  jump() {
    if (this.destination !== null && Number.isSafeInteger(this.destination))
      this.go(this.destination);
  }
}
