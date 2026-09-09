import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-overview-reports',
  standalone: false,
  templateUrl: './overview-reports.component.html',
  styleUrls: ['./overview-reports.component.scss']
})
export class OverviewReportsComponent {

  @Input() exportDays: number = 30;

  isExcelLoading: boolean = false;
  isBackupLoading: boolean = false;

  exportPeriodOptions = [
    { label: '7 дней', value: 7 },
    { label: '30 дней', value: 30 },
    { label: '90 дней', value: 90 },
    { label: 'Год', value: 365 }
  ];

  downloadExcel(): void {
    if (this.isExcelLoading) return;
    
    this.isExcelLoading = true;
    console.log(`Инициирован экспорт Excel за период: ${this.exportDays} дней`);
    
    setTimeout(() => {
      this.isExcelLoading = false;
      console.log('Файл Excel успешно сформирован и скачан');
    }, 2000);
  }

  downloadBackup(): void {
    if (this.isBackupLoading) return;
    
    this.isBackupLoading = true;
    console.log('Инициировано создание полной резервной выгрузки');
    
    setTimeout(() => {
      this.isBackupLoading = false;
      console.log('Резервная копия успешно скачана');
    }, 3000);
  }
}