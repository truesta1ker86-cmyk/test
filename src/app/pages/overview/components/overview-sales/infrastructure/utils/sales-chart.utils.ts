import type { ChartData, ChartOptions } from 'chart.js';
import type { SalesDynamics } from '../interfaces/sales-dynamics.interfaces';
import { SALES_COLORS } from '../constants/sales-dynamics.constants';
import { money } from '../../../../../../core/infrastructure/utils/format.utils';

export function salesDate(value: string): string {
  return value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4);
}

export function salesUnits(value: number): string {
  return value.toLocaleString('ru-RU');
}

export function salesChartData(data: SalesDynamics): ChartData<'line'> {
  return {
    labels: data.timeline.map((day) => salesDate(day.date).slice(0, 5)),
    datasets: [
      {
        label: 'Доставлено, шт.',
        data: data.timeline.map((day) => day.units),
        borderColor: SALES_COLORS.line,
        backgroundColor: SALES_COLORS.fill,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  };
}

export function salesChartOptions(data: SalesDynamics | null): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const first = items[0];
            const day = first && data?.timeline[first.dataIndex];
            return day ? salesDate(day.date) : '';
          },
          label: (item) => {
            const day = data?.timeline[item.dataIndex];
            return day
              ? [
                  'Доставлено: ' + salesUnits(day.units) + ' шт.',
                  'Выручка доставок: ' + money(day.revenue),
                ]
              : '';
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 12, color: SALES_COLORS.text } },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: SALES_COLORS.text },
        grid: { color: SALES_COLORS.grid },
      },
    },
  };
}
