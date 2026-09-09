import { Component } from '@angular/core';

interface StatCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

@Component({
  selector: 'app-overview-stats',
  standalone: false,
  templateUrl: './overview-stats.component.html',
  styleUrls: ['./overview-stats.component.scss']
})
export class OverviewStatsComponent {
  readonly stats: StatCard[] = [
    { title: 'Продажи за сегодня', value: '150 000 ₽', change: '+12.5%', isPositive: true },
    { title: 'Новые клиенты', value: '45', change: '+8.2%', isPositive: true },
    { title: 'Заказы в обработке', value: '18 шт.', change: '-2.4%', isPositive: false },
    { title: 'Ошибки синхронизации 1С', value: '0', change: '0%', isPositive: true }
  ];
}
