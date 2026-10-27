import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PrimeNG } from 'primeng/config';
import {
  PERIOD_RUSSIAN_LOCALE,
  PERIOD_SHORTCUTS,
} from '../../infrastructure/constants/period-picker.constants';
import type {
  CalendarDay,
  PeriodSelection,
} from '../../infrastructure/interfaces/period-selection.interfaces';
import {
  moscowToday,
  periodCaption,
  periodCursor,
  periodDate,
  periodIso,
  recentDays,
  recentMonth,
} from '../../infrastructure/utils/period-picker.utils';

@Component({
  selector: 'app-period-picker',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PrimeNG],
  templateUrl: './period-picker.component.html',
  styleUrl: './period-picker.component.css',
})
export class PeriodPickerComponent {
  @Input() start = '';
  @Input() end = '';
  @Input() period = 'custom';
  @Output() applied = new EventEmitter<PeriodSelection>();
  readonly opened = signal(false);
  readonly today = signal(moscowToday());
  readonly cursor = signal(periodCursor(this.today(), this.today()));
  readonly position = signal({ left: 12, top: 64 });
  readonly shortcuts = PERIOD_SHORTCUTS;
  readonly monthCount = signal(window.innerWidth <= 700 ? 1 : 2);
  readonly months = computed(() =>
    Array.from({ length: 6 }, (_, offset) => {
      const [start] = recentMonth(offset, this.today());
      const label = new Intl.DateTimeFormat('ru-RU', {
        month: 'long',
        ...(start.getFullYear() !== this.today().getFullYear() ? { year: 'numeric' } : {}),
      }).format(start);
      return { offset, label: label[0].toUpperCase() + label.slice(1) };
    }),
  );
  draft: (Date | null)[] = [];
  draftPeriod = 'custom';
  activeMonth: number | null = null;
  private cursorTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  constructor() {
    const parent = inject(PrimeNG, { skipSelf: true });
    inject(PrimeNG).setTranslation({
      ...parent.translation,
      ...PERIOD_RUSSIAN_LOCALE,
      aria: { ...parent.translation.aria, ...PERIOD_RUSSIAN_LOCALE.aria },
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.cursorTimer));
    effect((onCleanup) => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (!dialog.open) dialog.showModal();
      const place = () => {
        const anchor = this.trigger()?.nativeElement.getBoundingClientRect();
        if (!anchor) return;
        const size = dialog.getBoundingClientRect();
        this.position.set({
          left: Math.max(12, Math.min(anchor.left, window.innerWidth - size.width - 12)),
          top: Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - size.height - 12)),
        });
      };
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
      observer?.observe(dialog);
      const resize = () => {
        const count = window.innerWidth <= 700 ? 1 : 2;
        if (count !== this.monthCount()) {
          this.monthCount.set(count);
          this.cursor.set(new Date(this.cursor()));
        }
        place();
      };
      window.addEventListener('resize', resize);
      const frame = requestAnimationFrame(place);
      onCleanup(() => {
        observer?.disconnect();
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(frame);
      });
    });
  }

  get label(): string {
    return periodCaption(this.start, this.end);
  }
  get draftLabel(): string {
    return this.draft[0] && this.draft[1]
      ? periodCaption(periodIso(this.draft[0]), periodIso(this.draft[1]))
      : 'Выберите дату окончания';
  }
  get canApply(): boolean {
    const [start, end] = this.draft;
    return !!start && !!end && start <= end && end <= this.today();
  }

  open(): void {
    this.monthCount.set(window.innerWidth <= 700 ? 1 : 2);
    this.today.set(moscowToday());
    const fallback = recentDays(30, this.today());
    this.draft = [periodDate(this.start) || fallback[0], periodDate(this.end) || fallback[1]];
    this.draftPeriod = this.period;
    this.activeMonth = null;
    this.opened.set(true);
    this.showRangeMonth();
  }
  cancel(): void {
    this.opened.set(false);
    clearTimeout(this.cursorTimer);
  }
  apply(): void {
    if (!this.canApply) return;
    const value = {
      start: periodIso(this.draft[0]!),
      end: periodIso(this.draft[1]!),
      period: this.draftPeriod,
    };
    this.cancel();
    this.applied.emit(value);
  }
  setDraft(value: (Date | null)[] | null): void {
    const previous = this.draft[0];
    if (previous && !this.draft[1] && value?.[0] && !value[1] && value[0] < previous) {
      this.draft = [value[0], previous];
      this.showRangeMonth();
    } else this.draft = value || [];
    this.draftPeriod = 'custom';
    this.activeMonth = null;
  }
  preset(days: number): void {
    this.draft = recentDays(days, this.today());
    this.draftPeriod = String(days);
    this.activeMonth = null;
    this.showRangeMonth();
  }
  viewChanged(value: { month?: number; year?: number }): void {
    if (value.month === undefined || value.year === undefined) return;
    this.cursor.set(new Date(value.year, value.month - 1, 1, 12));
  }
  month(offset: number): void {
    this.draft = recentMonth(offset, this.today());
    this.draftPeriod = 'custom';
    this.activeMonth = offset;
    this.showRangeMonth();
  }
  weekend(day: CalendarDay): boolean {
    return [0, 6].includes(new Date(day.year, day.month, day.day).getDay());
  }
  edge(day: CalendarDay): boolean {
    return this.draft.some(
      (date) =>
        !!date &&
        date.getFullYear() === day.year &&
        date.getMonth() === day.month &&
        date.getDate() === day.day,
    );
  }
  inside(day: CalendarDay): boolean {
    if (!this.draft[0] || !this.draft[1]) return false;
    const date = new Date(day.year, day.month, day.day, 12);
    return date >= this.draft[0] && date <= this.draft[1];
  }
  outside(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (event.target !== dialog || !dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      this.cancel();
  }
  private showRangeMonth(): void {
    clearTimeout(this.cursorTimer);
    const start = this.draft[0] || this.today();
    this.cursorTimer = setTimeout(() => {
      if (this.opened()) this.cursor.set(periodCursor(start, this.today()));
    }, 0);
  }
}
