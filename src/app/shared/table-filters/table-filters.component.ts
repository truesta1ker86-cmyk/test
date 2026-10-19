import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  effect,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-table-filters',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-filters.component.html',
  styleUrl: './table-filters.component.css',
})
export class TableFiltersComponent {
  @Input() open = false;
  @Input() count = 0;
  @Input() label = 'Фильтры таблицы';
  @Output() openChange = new EventEmitter<boolean>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly show = effect(() => {
    const dialog = this.dialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  });

  close(): void {
    this.openChange.emit(false);
  }
}
