import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

export type PopupPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

@Component({
  selector: 'app-popup-button',
  standalone: false,
  templateUrl: './popup-button.component.html',
  styleUrls: ['./popup-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupButtonComponent {
  @Input() icon: string = 'i-filter';
  @Input() label: string = '';
  @Input() ariaLabel: string = 'Открыть панель';
  @Input() count: number = 0;
  @Input() showCount: boolean = true;
  @Input() position: PopupPosition = 'bottom-right';
  @Input() popupWidth: string = 'min(340px, calc(100vw - 64px))';
  @Input() triggerClass: string = 'stock-filter-trigger';
  @Input() popoverClass: string = 'stock-filter-popover';
  @Input() open: boolean = false;

  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('popover') popoverRef!: ElementRef<HTMLElement>;

  constructor(private cdr: ChangeDetectorRef) {}

  toggle(event?: Event): void {
    event?.stopPropagation();
    this.open = !this.open;
    this.openChange.emit(this.open);
    this.cdr.markForCheck();
  }

  show(): void {
    if (!this.open) {
      this.open = true;
      this.openChange.emit(true);
      this.cdr.markForCheck();
    }
  }

  close(): void {
    if (this.open) {
      this.open = false;
      this.openChange.emit(false);
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as HTMLElement;
    const popover = this.popoverRef?.nativeElement;
    if (popover && !popover.contains(target) && !target.closest('.popup-button-trigger')) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }
}
