import { Component, OnInit, Input } from '@angular/core';
import { mockSalesData } from '../../../infrastructure/test-data/sales-data';

@Component({
  selector: 'app-overview-charts',
  standalone: false,
  templateUrl: './overview-charts.component.html',
  styleUrls: ['./overview-charts.component.scss']
})
export class OverviewChartsComponent implements OnInit {
  @Input() dynDays: number = 30;

  chartHeight: string = '450px';
  isLoading: boolean = false;

  daysOptions = [
    { label: '7 дней', value: 7 },
    { label: '14 дней', value: 14 },
    { label: '30 дней', value: 30 }
  ];

  summary = {
    totalCount: 0,
    totalAmount: 0,
    peakDate: '',
    peakCount: 0
  };

  chartData: any;
  chartOptions: any;

  ngOnInit(): void {
    this.initChartOptions();
    this.loadSalesData();
  }

  onDaysChange(): void {
    this.dynDays = Number(this.dynDays);
    this.loadSalesData();
  }

  private initChartOptions(): void {
    this.chartOptions = {
      indexAxis: 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => ` Заказы: ${context.raw} шт`
          }
        }
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: '#667085',
            font: { family: 'SF Pro Text, sans-serif', size: 11 },
            autoSkip: false
          }
        },        
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: 'rgba(16, 24, 40, 0.05)' },
          ticks: {
            color: '#667085',
            stepSize: 1,
            callback: (value: number) => `${value}`,
            font: { family: 'SF Pro Text, sans-serif', size: 11 }
          }
        }
      }
    };
  }

  private loadSalesData() {
    this.isLoading = false;
    const data = mockSalesData[this.dynDays];
    this.parseAndRenderData(data);
  }

  private parseAndRenderData(response: any) {
    if (this.dynDays === 7) this.chartHeight = '200px';
    else if (this.dynDays === 14) this.chartHeight = '240px';
    else this.chartHeight = '450px';

    const rawPeakDate = response.best_day.date;
    const formattedPeakDate = rawPeakDate ? rawPeakDate.substring(5) : '—';

    this.summary = {
      totalCount: response.total_units,
      totalAmount: response.total_revenue,
      peakDate: formattedPeakDate,
      peakCount: response.best_day.units
    };

    let dataPoints: number[] = new Array();
    let yLabels: string[] = new Array();

    response.timeline.forEach((item: any) => {
      dataPoints.push(item.units);
      yLabels.push(item.date.substring(5));
    });

    if (this.chartOptions?.scales?.x) {
      this.chartOptions.scales.x.max = Math.max(response.best_day.units + 1, 4);
    }

    this.chartData = {
      labels: yLabels,
      datasets: [{
        label: 'Заказы (шт)',
        data: dataPoints,
        borderColor: '#005BFF',
        backgroundColor: 'rgba(0, 91, 255, 0.04)',
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#005BFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }
}
