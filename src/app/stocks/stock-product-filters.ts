import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalFocus } from '../shared/modal-focus';
import { Icon } from '../shared/icon';
import { stockFacetFields } from './filter-state';
import { StockChoice, StockChoiceFilter } from './stock-choice';

export type StockTextFilterChange = {
  field: 'article' | 'name' | 'articleOperator' | 'nameOperator';
  value: string;
};

@Component({
  selector: 'app-stock-product-filters',
  imports: [FormsModule, StockChoiceFilter, ModalFocus, Icon],
  templateUrl: './stock-product-filters.html',
  styleUrl: './stock-product-filters.css',
})
export class StockProductFilters {
  readonly choices = input.required<Record<string, StockChoice[]>>();
  readonly values = input.required<Record<string, string[]>>();
  readonly reconciliation = input(false);
  readonly article = input('');
  readonly name = input('');
  readonly articleOperator = input('contains');
  readonly nameOperator = input('contains');
  readonly busy = input(false);
  readonly selected = input(0);
  readonly filterChanged = output<{ key: string; values: string[] }>();
  readonly textChanged = output<StockTextFilterChange>();
  readonly filtersReset = output<void>();
  readonly filtersApplied = output<void>();
  readonly selectFound = output<void>();
  readonly clearSelection = output<void>();
  readonly opened = signal(false);
  readonly activeCount = computed(
    () =>
      Object.values(this.values()).filter((v) => v.length).length +
      Number(!!this.article().trim()) +
      Number(!!this.name().trim()),
  );
  readonly fields = computed(() => [
    ...stockFacetFields,
    ['mapping_status', 'Связь с 1С'],
    ['rules_status', 'Наличие правил'],
    ['distribution_status', 'Распределение'],
    ...(this.reconciliation()
      ? [
          ['status', 'Расхождение FBS'],
          ['source', 'Источник остатка'],
        ]
      : []),
  ]);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  private readonly showDialog = effect(() => {
    const dialog = this.dialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  });
  close() {
    this.opened.set(false);
  }
  backdrop(event: MouseEvent) {
    const dialog = this.dialog()?.nativeElement;
    if (event.target !== dialog || !dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      this.close();
  }
  done() {
    this.filtersApplied.emit();
    this.close();
  }
  selectProducts() {
    if (!this.busy()) {
      this.selectFound.emit();
      this.close();
    }
  }
  clearProducts() {
    this.clearSelection.emit();
    this.close();
  }
}
