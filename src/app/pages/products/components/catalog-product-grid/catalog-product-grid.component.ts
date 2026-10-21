import {
  computed as selectionComputed,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  CATALOG_PRODUCT_GRID_TABLE_COLUMNS1,
  CATALOG_PRODUCT_GRID_COLUMNS,
} from './infrastructure/constants/catalog-product-grid.constants';
import type { DataTableColumn } from '../../../../shared/data-table/infrastructure/interfaces/data-table-config.interfaces';
import type { CatalogRow } from '../../infrastructure/interfaces/contracts.interfaces';
import type { ActionKind } from '../../infrastructure/types/contracts.types';
import { money, percent, source } from '../../../../core/infrastructure/utils/format.utils';
import { ColumnChange, ColumnRules } from '../../../../shared/directives/filter-panel/filter-panel';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-catalog-product-grid',

  templateUrl: './catalog-product-grid.component.html',
  styleUrls: [
    '../../../pricing/infrastructure/styles/pricing-workflow.css',
    '../../../pricing/components/pricing-grid/pricing-grid.component.css',
    './catalog-product-grid.component.css',
  ],
})
export class CatalogProductGrid {
  readonly visibleTableSelection = selectionComputed(() =>
    this.rows().filter((row) => this.selected().has(row.offer_id)),
  );

  tableColumns1(): DataTableColumn[] {
    return CATALOG_PRODUCT_GRID_TABLE_COLUMNS1;
  }

  readonly rows = input<CatalogRow[]>([]);
  readonly selected = input<Set<string>>(new Set());
  readonly allSelected = input(false);
  readonly canManage = input(false);
  readonly loading = input(false);
  readonly sort = input('offer_id');
  readonly direction = input('asc');
  readonly columnRules = input<ColumnRules>({});
  readonly columnOptions = input<Record<string, string[]>>({});
  readonly columnCounts = input<Record<string, Record<string, number>>>({});
  readonly toggled = output<string>();
  readonly filteredSelected = output<boolean>();
  readonly sorted = output<string>();
  readonly columnChanged = output<ColumnChange>();
  readonly edited = output<{ kind: ActionKind; row: CatalogRow; field?: string }>();
  readonly card = output<CatalogRow>();
  readonly details = output<CatalogRow>();
  readonly campaign = output<string[]>();
  readonly money = money;
  readonly percent = percent;
  readonly source = source;
  readonly columns = CATALOG_PRODUCT_GRID_COLUMNS;
}
