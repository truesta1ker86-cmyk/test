import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FilterService } from '../../../directives/filter-panel/infrastructure/services/filter.service';
import { DataTableFilterState } from '../../infrastructure/services/data-table-filter-state.service';
import type {
  DataTableFilterRule,
  DataTableFilterChange,
  DataTableFilterValuesRequest,
} from '../../infrastructure/interfaces/data-table-filter.interfaces';
import {
  FILTER_VALUES_PAGE_SIZE,
  FILTER_MAX_EXPLICIT_VALUES,
  FILTER_SEARCH_DELAY,
} from '../../infrastructure/constants/data-table-filter.constants';
import {
  filterPosition,
  filterSearch,
  filterValueLabel,
} from '../../infrastructure/utils/data-table-filter.utils';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-data-table-filter, app-column-filter',
  providers: [FilterService, DataTableFilterState],
  templateUrl: './data-table-filter.component.html',
  styleUrl: './data-table-filter.component.css',
})
export class DataTableFilterComponent {
  readonly field = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<string[]>([]);
  readonly counts = input<Readonly<Record<string, number>>>({});
  readonly numeric = input(false);
  readonly allowEmpty = input(true);
  readonly remoteOptions = input(false);
  readonly optionsBusy = input(false);
  readonly optionsHasMore = input(false);
  readonly optionsTotal = input(0);
  readonly optionsError = input('');
  readonly rule = input<DataTableFilterRule | undefined>();
  readonly changed = output<DataTableFilterChange>();
  readonly optionsRequested = output<DataTableFilterValuesRequest>();
  readonly opening = output<void>();
  readonly closed = output<void>();
  readonly opened = signal(false);
  readonly valuesPage = signal(1);
  readonly visibleLimit = signal(FILTER_VALUES_PAGE_SIZE);
  readonly position = signal({ left: 12, top: 12 });
  readonly state = inject(DataTableFilterState);
  readonly filters = this.state.filters;
  readonly error = this.state.error;
  readonly valueLabel = filterValueLabel;
  readonly search = computed(() => String(this.filters.getValue('choice_search') || '').trim());
  readonly valuesBusy = computed(
    () => this.optionsBusy() || (this.remoteOptions() && this.search() !== this.requestedSearch()),
  );
  readonly found = computed(() =>
    this.allValues().filter((value) =>
      filterSearch(filterValueLabel(value)).includes(filterSearch(this.search())),
    ),
  );
  readonly visibleValues = computed(() => this.found().slice(0, this.visibleLimit()));
  readonly allChecked = computed(
    () => this.state.values() === null && !this.state.excluded().length,
  );
  readonly indeterminate = computed(() =>
    this.state.values() === null ? this.state.excluded().length > 0 : !!this.state.values()?.length,
  );
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly destroy = inject(DestroyRef);
  private readonly requestedSearch = signal('');
  private selectingFound: Set<string> | null = null;

  constructor() {
    effect((onCleanup) => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (!dialog.open) dialog.showModal();
      const place = () => {
        const anchor = this.trigger()?.nativeElement.getBoundingClientRect();
        if (!anchor) return;
        const size = dialog.getBoundingClientRect();
        const next = filterPosition(
          anchor,
          size.width,
          size.height,
          window.innerWidth,
          window.innerHeight,
        );
        this.position.update((current) =>
          current.left === next.left && current.top === next.top ? current : next,
        );
      };
      place();
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
      observer?.observe(dialog);
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      onCleanup(() => {
        observer?.disconnect();
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
      });
    });
    effect(() => {
      this.options();
      if (!this.opened()) return;
      if (this.search() !== this.requestedSearch()) {
        untracked(() => {
          this.selectingFound = null;
        });
        return;
      }
      if (this.optionsBusy()) return;
      const hasMore = this.optionsHasMore(),
        error = this.optionsError();
      untracked(() => {
        if (!this.selectingFound) return;
        if (error) {
          this.selectingFound = null;
          return;
        }
        for (const value of this.found()) this.selectingFound.add(value);
        if (hasMore) this.requestValues(this.valuesPage() + 1, true);
        else {
          this.state.selectFound([...this.selectingFound]);
          this.selectingFound = null;
        }
      });
    });
    toObservable(this.search)
      .pipe(
        debounceTime(FILTER_SEARCH_DELAY),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((search) => {
        this.visibleLimit.set(FILTER_VALUES_PAGE_SIZE);
        if (this.opened() && this.remoteOptions() && search !== this.requestedSearch()) {
          this.selectingFound = null;
          this.requestValues(1, true);
        }
      });
  }

  allValues(): string[] {
    return [
      ...new Set([...this.options(), ...(this.state.values() || []), ...this.state.excluded()]),
    ];
  }

  open(): void {
    this.state.open(this.numeric(), this.rule());
    this.visibleLimit.set(FILTER_VALUES_PAGE_SIZE);
    this.selectingFound = null;
    this.opened.set(true);
    this.opening.emit();
    if (this.remoteOptions()) this.requestValues(1, true);
  }

  close(): void {
    if (!this.opened()) return;
    this.selectingFound = null;
    this.opened.set(false);
    this.closed.emit();
  }

  outside(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      this.close();
  }

  toggle(value: string, event: Event): void {
    this.state.toggle(value, (event.target as HTMLInputElement).checked);
  }

  toggleAll(event: Event): void {
    this.state.all((event.target as HTMLInputElement).checked);
  }

  selectFound(): void {
    if (this.valuesBusy() || this.optionsError()) return;
    if (!this.search()) {
      this.state.all(true);
      return;
    }
    if (
      (this.remoteOptions() ? this.optionsTotal() : this.found().length) >
      FILTER_MAX_EXPLICIT_VALUES
    ) {
      this.error.set('Слишком много значений. Уточните поиск или отметьте «Все значения».');
      return;
    }
    if (this.remoteOptions() && this.optionsHasMore()) {
      this.selectingFound = new Set(this.found());
      this.requestValues(this.valuesPage() + 1, true);
    } else this.state.selectFound(this.found());
  }

  requestValues(page = 1, force = false): void {
    if (this.optionsBusy() && !force) return;
    this.valuesPage.set(page);
    this.requestedSearch.set(this.search());
    this.optionsRequested.emit({ search: this.requestedSearch(), page });
  }

  showMore(): void {
    this.visibleLimit.update((value) => value + FILTER_VALUES_PAGE_SIZE);
  }

  apply(): void {
    if (this.valuesBusy() || this.optionsError() || this.selectingFound) return;
    const rule = this.state.apply(this.allValues(), !this.remoteOptions(), this.allowEmpty());
    if (rule === undefined) return;
    this.changed.emit({ field: this.field(), rule });
    this.close();
  }

  reset(): void {
    this.filters.resetAll();
    this.changed.emit({ field: this.field(), rule: null });
    this.close();
  }
}
