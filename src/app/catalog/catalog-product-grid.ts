import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogRow, ActionKind } from './contracts';
import { money, percent, source } from '../core/format';
import {
  FinanceColumnFilter,
  FinanceColumnChange,
  FinanceColumnRules,
} from '../finance/finance-column-filter';
@Component({
  selector: 'app-catalog-product-grid',
  imports: [RouterLink, FinanceColumnFilter],
  templateUrl: './catalog-product-grid.html',
  styleUrls: [
    '../pricing/pricing-workflow.css',
    '../pricing/pricing-grid.css',
    './catalog-product-grid.css',
  ],
})
export class CatalogProductGrid {
  readonly rows = input<CatalogRow[]>([]);
  readonly selected = input<Set<string>>(new Set());
  readonly allSelected = input(false);
  readonly canManage = input(false);
  readonly loading = input(false);
  readonly sort = input('offer_id');
  readonly direction = input('asc');
  readonly columnRules = input<FinanceColumnRules>({});
  readonly columnOptions = input<Record<string, string[]>>({});
  readonly toggled = output<string>();
  readonly filteredSelected = output<boolean>();
  readonly sorted = output<string>();
  readonly columnChanged = output<FinanceColumnChange>();
  readonly edited = output<{ kind: ActionKind; row: CatalogRow; field?: string }>();
  readonly card = output<CatalogRow>();
  readonly details = output<CatalogRow>();
  readonly campaign = output<string[]>();
  readonly money = money;
  readonly percent = percent;
  readonly source = source;
  readonly columns = [
    { key: 'offer_id', label: 'Артикул', sort: 'offer_id' },
    { key: 'name', label: 'Номенклатура', sort: 'name' },
    { key: 'category_name', label: 'Категория маркетплейса' },
    { key: 'type_name', label: 'Тип маркетплейса' },
    { key: 'report_category', label: 'FIN-категория' },
    { key: 'report_type', label: 'FIN-тип' },
    { key: 'fixed_margin', label: 'Целевая маржа, %', numeric: true },
    { key: 'units_sold', label: 'Доставлено', numeric: true, sort: 'units_sold' },
    { key: 'price', label: 'Цена, ₽', numeric: true, sort: 'price' },
    { key: 'package_cost', label: 'Себес × квант', numeric: true, sort: 'package_cost' },
    { key: 'promotion_model_title', label: 'Модель акций' },
  ];
}
