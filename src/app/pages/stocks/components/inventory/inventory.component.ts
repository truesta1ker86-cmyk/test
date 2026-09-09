import { Component } from '@angular/core';
import { ReconciliationItem, Stock, StockFilter } from '../../infrastructure/models/stock.model';
import { StockService } from '../../infrastructure/services/stock.service';
import { catchError, finalize, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-inventory',
  standalone: false,
  styleUrls: ['./inventory.component.scss'],
  templateUrl: './inventory.component.html'
})
export class InventoryComponent {
  pageTitle = 'Общий остаток';
  pageSubtitle = 'Единый список маркетплейса и 1С · источник указан в каждой строке';

  stocks: Stock[] = [];
  reconciliationItems: ReconciliationItem[] = [];
  filteredStocks: Stock[] = [];
  filteredReconciliation: ReconciliationItem[] = [];
  loading = false;
  oneCWarehouses: any[] = [];

  search = '';
  source = '';

  filter: StockFilter = {
    search: '',
    source: '',
    category: '',
    type: '',
    brand: '',
    group: '',
    series: '',
    length: '',
    color: '',
    package: '',
  };
  categories: { value: string; label: string }[] = [];
  types: { value: string; label: string }[] = [];
  brands: string[] = [];
  groups: string[] = [];
  series: string[] = [];
  lengths: string[] = [];
  colors: string[] = [];
  packages: string[] = [];

  constructor(private stockService: StockService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // Используем forkJoin для параллельных запросов
    forkJoin({
      stocks: this.stockService
        .getStocks()
        .pipe(catchError(() => of({ items: [], meta: { total: 0, has_more: false } }))),
      reconciliation: this.stockService
        .getReconciliations()
        .pipe(catchError(() => of({ items: [] }))),
      warehouses: this.stockService.getWarehouses().pipe(catchError(() => of({ items: [] }))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (result) => {
          this.stocks = result.stocks.items || [];
          this.reconciliationItems = result.reconciliation.items || [];
          this.oneCWarehouses = result.warehouses.items || [];
          this.applyFilter();
        },
        error: () => {
          // Ошибки уже обработаны через catchError, но на всякий случай
          this.stocks = [];
          this.reconciliationItems = [];
          this.oneCWarehouses = [];
          this.applyFilter();
        },
      });
  }

  onFilterChange(filter: { search: string; source: string }): void {
    this.search = filter.search;
    this.source = filter.source;
    this.applyFilter();
  }

  applyFilter(): void {
    let filtered = this.stocks;
    if (this.source) {
      filtered = filtered.filter((s) => s.source === this.source);
    }
    if (this.search) {
      const q = this.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.offer_id || '').toLowerCase().includes(q) ||
          (s.sku_1c || '').toLowerCase().includes(q) ||
          (s.product_name || '').toLowerCase().includes(q),
      );
    }
    this.filteredStocks = filtered;

    // Фильтрация reconciliation (только по поиску, источник не применяется)
    let recon = this.reconciliationItems;
    if (this.search) {
      const q = this.search.toLowerCase();
      recon = recon.filter(
        (item) =>
          (item.offer_id || '').toLowerCase().includes(q) ||
          (item.product_name || '').toLowerCase().includes(q),
      );
    }
    this.filteredReconciliation = recon;
  }

  refresh(): void {
    this.stockService.refreshStocks().subscribe(() => this.loadData());
  }

  getTotalAvailable(offerId: string): number {
    return this.stocks
      .filter((s) => s.offer_id === offerId && s.source === '1c')
      .reduce((sum, s) => sum + (s.available || 0), 0);
  }

  getWarehouseCount(offerId: string): number {
    const warehouses = new Set(
      this.stocks
        .filter((s) => s.offer_id === offerId && s.source === '1c' && s.warehouse_id)
        .map((s) => s.warehouse_id),
    );
    return warehouses.size;
  }

  onOpenProduct(offerId: string): void {
    console.log('Открыть продукт', offerId);
  }
}
