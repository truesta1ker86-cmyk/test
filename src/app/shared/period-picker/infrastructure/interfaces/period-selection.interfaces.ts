export interface PeriodSelection {
  start: string;
  end: string;
  period: string;
}

export interface CalendarDay {
  day: number;
  month: number;
  year: number;
  selectable?: boolean;
}
