import { ProductName } from '../shared/product-name';
import { Component, computed, input, output, signal } from '@angular/core';
import { StockPager } from './stock-pager';
import { StockRunPreview, StockWarehouse } from './contracts';
@Component({
  selector: 'app-stock-run-preview',
  imports: [StockPager, ProductName],
  template: ` <section class="run-panel" aria-label="Разовая проверка сохранённых правил">
    <header>
      <div>
        <h2>Разовая проверка сохранённых правил</h2>
        <p>Учтены склад-источник 1С из профиля, FBS-заказы после снимка и ожидаемые поставки.</p>
      </div>
      <button class="button" (click)="close.emit()">Закрыть проверку</button>
    </header>
    <div class="run-summary">
      <span
        >Товаров: <b>{{ plan().products }}</b></span
      ><span
        >Правил к расчёту: <b>{{ plan().rules }}</b></span
      ><span
        >Рассчитано: <b>{{ plan().ready }}</b></span
      ><span
        >Нет данных: <b>{{ plan().blocked }}</b></span
      ><span
        >Без правил: <b>{{ plan().without_rules }}</b></span
      >
    </div>
    <p class="run-mode">Режим проверки · отправка в Ozon остановлена</p>
    <div class="run-table">
      <table>
        <thead>
          <tr>
            <th>Товар</th>
            <th>Склад</th>
            <th>Сейчас в Ozon</th>
            <th>К показу</th>
            <th>Источник расчёта</th>
            <th>Заказы после снимка</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.offer_id + '	' + row.warehouse_id) {
            <tr>
              <td>
                <span [appProductName]="row">{{ row.name || row.offer_id }}</span
                ><small>{{ row.offer_id }}</small>
              </td>
              <td>{{ warehouseName(row.warehouse_id) }}</td>
              <td>{{ row.current_ozon_qty ?? '—' }}</td>
              <td>
                <strong>{{ row.qty ?? '—' }}</strong
                ><small>{{
                  row.status === 'unchanged'
                    ? 'Уже совпадает'
                    : row.status === 'missing_1c'
                      ? 'Нет данных 1С'
                      : 'Результат проверки'
                }}</small>
              </td>
              <td>{{ sources[row.source] || row.source }}</td>
              <td>{{ row.protected_fbs_orders }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">У выбранных товаров нет подходящих сохранённых правил.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-stock-pager
      label="Страницы разовой проверки"
      [page]="page()"
      [size]="size()"
      [total]="plan().items.length"
      (pageChange)="page.set($event.page); size.set($event.size)"
    />
  </section>`,
  styles: `
    :host {
      display: block;
      scroll-margin-top: 76px;
    }
    .run-panel {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
    }
    header {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: start;
    }
    h2 {
      font-size: 16px;
      margin: 0 0 8px;
    }
    p {
      font-size: 12px;
      color: var(--muted);
      margin: 0 0 14px;
      line-height: 1.6;
    }
    .run-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 12px;
      margin: 16px 0;
    }
    .run-mode {
      background: var(--brand-soft);
      color: var(--brand);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .run-table {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    table {
      width: 100%;
      min-width: 850px;
      border-collapse: collapse;
      font-size: 12px;
    }
    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--surface-2);
      white-space: nowrap;
      font-weight: 550;
    }
    td:first-child {
      min-width: 220px;
      max-width: 300px;
    }
    small {
      display: block;
      font-size: 10px;
      color: var(--muted);
      margin-top: 4px;
    }
    @media (max-width: 720px) {
      .run-panel {
        padding: 14px;
      }
      header {
        flex-wrap: wrap;
      }
    }
  `,
})
export class StockRunPanel {
  readonly plan = input.required<StockRunPreview>();
  readonly warehouses = input<StockWarehouse[]>([]);
  readonly close = output<void>();
  readonly page = signal(1);
  readonly size = signal(100);
  readonly rows = computed(() =>
    this.plan().items.slice((this.page() - 1) * this.size(), this.page() * this.size()),
  );
  readonly sources: Record<string, string> = {
    physical_1c: 'Остаток 1С после защиты заказами',
    expected_receipt: 'Ожидаемая поставка',
    expected_receipt_expired: 'Срок ожидаемой поставки истёк',
    legacy_target: 'Фиксированное количество',
    matrix_disabled: 'Нулевое выключенное правило',
  };
  warehouseName(id: string | null) {
    return (
      this.warehouses().find((row) => row.warehouse_id === id)?.warehouse_name || id || 'Все склады'
    );
  }
}
